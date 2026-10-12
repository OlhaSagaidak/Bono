import "server-only";

/** The sandbox app's client ID. Safe to send to the browser (unlike the secret). */
export function payPalClientId(): string {
  const id = process.env.PAYPAL_CLIENT_ID;
  if (!id) throw new Error("PAYPAL_CLIENT_ID must be set (sandbox app client ID).");
  return id;
}
