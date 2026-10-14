import "server-only";

// Direct REST access for the PayPal APIs the generated SDK doesn't cover
// (Payouts). Sandbox only, like everything else in Bono. Calls go through an
// OAuth access token from /v1/oauth2/token, cached until a minute before it
// expires (PayPal issues them for hours).

const BASE_URL = "https://api-m.sandbox.paypal.com";

const tokenCache = globalThis as unknown as { paypalRestToken?: { value: string; expiresAt: number } };

async function accessToken(): Promise<string> {
  const cached = tokenCache.paypalRestToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set.");
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`PayPal token request failed: ${res.status}`);
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("PayPal token response had no access_token");
  tokenCache.paypalRestToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}

export type RestResult<T> = { ok: true; status: number; body: T } | { ok: false; status: number; body: PayPalRestError | null };
export type PayPalRestError = {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: { issue?: string }[];
  links?: { href?: string; rel?: string }[];
};

/** One JSON call to the PayPal REST API. Network failures throw; HTTP errors come back as ok: false. */
export async function paypalRest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<RestResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401) tokenCache.paypalRestToken = undefined; // re-fetch next time
  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;
  return res.ok
    ? { ok: true, status: res.status, body: parsed as T }
    : { ok: false, status: res.status, body: parsed as PayPalRestError | null };
}
