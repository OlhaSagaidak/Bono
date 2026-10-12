import "server-only";
import { PaypalClient } from "pay-pal-server-sdk";

// One client per server process. The OAuth token cache lives on it, so a
// client per request would fetch a new token every time. Kept on globalThis
// so Next's dev hot reload doesn't throw the cache away on every edit.
const globalForPayPal = globalThis as unknown as { paypalClient?: PaypalClient };

export function getPayPalClient(): PaypalClient {
  if (globalForPayPal.paypalClient) return globalForPayPal.paypalClient;

  // The SDK doesn't fail on a missing credential: requests would just go out
  // unauthenticated and come back 401. Fail here instead, naming the variable.
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set (sandbox app credentials).");
  }

  globalForPayPal.paypalClient = new PaypalClient({
    // No serverOptions on purpose: the SDK's only host is the sandbox,
    // https://api-m.sandbox.paypal.com, and Bono is sandbox-only.
    oauth2: { clientId, clientSecret },
    // Per attempt. The SDK's default is a minute; a donor shouldn't wait that long.
    // Its default retry policy is kept: it never retries POSTs (create/capture),
    // so a payment is never sent twice by the SDK.
    retry: { timeout: 15_000 },
  });
  return globalForPayPal.paypalClient;
}
