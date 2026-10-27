// The PayPal redirect flow on phones (pay-pal-server-sdk-plan.md, slice 5):
// what /paypal/return accepts. Shared by the server (building the URLs) and
// the return page (reading them), and free of server code for that reason.

export const RETURN_KINDS = ["donation", "fee", "campaign", "boost"] as const;
export type ReturnKind = (typeof RETURN_KINDS)[number];

export const isReturnKind = (value: unknown): value is ReturnKind => RETURN_KINDS.includes(value as ReturnKind);

/** A path on this site ("/nonprofits/…"), never another site ("//evil.example", "https://…"). */
export function safeBackPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value.length <= 200 ? value : null;
}

/** PayPal's order ids, as our capture actions accept them. */
export const isOrderId = (value: unknown): value is string => typeof value === "string" && /^[A-Z0-9]{1,64}$/.test(value);
