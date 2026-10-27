import "server-only";
import { headers } from "next/headers";
import type { ReturnKind } from "./return-params";

/**
 * Where PayPal sends a phone buyer back to after approving or cancelling.
 * The origin comes from the request (Render sets x-forwarded-host/proto), so
 * it is right locally and on the live site; a forged header could only
 * affect the requester's own order.
 */
export async function paypalReturnUrls(kind: ReturnKind, back: string): Promise<{ returnUrl: string; cancelUrl: string }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = new URL("/paypal/return", `${proto}://${host}`);
  url.searchParams.set("kind", kind);
  url.searchParams.set("back", back);
  const returnUrl = url.toString();
  url.searchParams.set("cancelled", "1");
  return { returnUrl, cancelUrl: url.toString() };
}
