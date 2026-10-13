import "server-only";
import { verify, X509Certificate, type KeyObject } from "node:crypto";
import { crc32 } from "node:zlib";

// Verifies that a webhook really comes from PayPal, using PayPal's documented
// self-verification (developer.paypal.com/api/rest/webhooks/rest/): PayPal
// signs "<transmission id>|<transmission time>|<our webhook id>|<CRC32 of the
// raw body, in decimal>" with SHA256, and sends the URL of the certificate to
// check it with. The PayPal server SDK has no webhook support, so this is ours.
//
// Replaying a genuine old event is harmless: the handler only uses an event to
// find our record, then re-reads the real state from PayPal.

export type WebhookCheck = { ok: true } | { ok: false; reason: string };

// Certificates rarely change; keep the few we've seen, by URL.
const certCache = new Map<string, KeyObject>();

/** Only PayPal may host the certificate, or a forger could sign with their own. */
function isPayPalCertUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "paypal.com" || url.hostname.endsWith(".paypal.com"));
  } catch {
    return false;
  }
}

async function publicKeyFor(certUrl: string): Promise<KeyObject> {
  const cached = certCache.get(certUrl);
  if (cached) return cached;
  const res = await fetch(certUrl, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`certificate download failed: ${res.status}`);
  const cert = new X509Certificate(await res.text());
  const now = Date.now();
  if (now < Date.parse(cert.validFrom) || now > Date.parse(cert.validTo)) throw new Error("certificate is not currently valid");
  if (certCache.size > 10) certCache.clear();
  certCache.set(certUrl, cert.publicKey);
  return cert.publicKey;
}

/** `rawBody` must be the exact bytes PayPal sent, before any JSON parsing. */
export async function verifyPayPalWebhook(headers: Headers, rawBody: Buffer): Promise<WebhookCheck> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return { ok: false, reason: "PAYPAL_WEBHOOK_ID is not set" };

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const signature = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  if (!transmissionId || !transmissionTime || !signature || !certUrl) {
    return { ok: false, reason: "missing PayPal signature headers" };
  }
  if (!isPayPalCertUrl(certUrl)) return { ok: false, reason: "certificate URL is not on paypal.com" };

  const message = `${transmissionId}|${transmissionTime}|${webhookId}|${crc32(rawBody)}`;
  try {
    const key = await publicKeyFor(certUrl);
    const valid = verify("sha256", Buffer.from(message, "utf8"), key, Buffer.from(signature, "base64"));
    return valid ? { ok: true } : { ok: false, reason: "signature does not match" };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "verification failed" };
  }
}
