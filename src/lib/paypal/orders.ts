import "server-only";
import {
  CheckoutPaymentIntent,
  PayPalExperienceUserAction,
  PayPalWalletContextShippingPreference,
  PaypalError,
  type Error as PayPalApiError,
  type Order,
} from "pay-pal-server-sdk";
import { getPayPalClient } from "./client";

// Thin wrappers over the PayPal Orders API (via the APIMatic-generated SDK).
// They turn the SDK's results and errors into small outcome types, so the
// donation code never handles SDK types. Contract details and the reasoning
// behind each choice: pay-pal-server-sdk-plan.md at the repo root.

const CURRENCY = "USD";

/** "2500" cents -> "25.00", the string format PayPal's amount.value expects. */
export const centsToValue = (cents: number) => (cents / 100).toFixed(2);

/** What PayPal said when it refused a call, for logs and for choosing a message. */
type Refusal = { status: number; issue?: string; debugId?: string };

// Every declared error arm of createOrder, captureOrder and getOrder carries
// the same `Error` model, so this reads the body by shape rather than by arm
// name (arm names differ per operation). The "undeclared" arm has no body.
function refusal(status: number, payload: unknown): Refusal {
  const body =
    typeof payload === "object" && payload !== null && "body" in payload
      ? (payload as { body?: PayPalApiError }).body
      : undefined;
  return { status, issue: body?.details?.[0]?.issue ?? body?.name, debugId: body?.debugId };
}

// Failures where PayPal gave no usable answer: network, timeout, an unreadable
// response, bad credentials. Anything that isn't an SDK error is a bug: rethrow.
function noAnswer(err: unknown, operation: string): { kind: "unknown" } {
  if (!(err instanceof PaypalError)) throw err;
  // err.message names the call and the failure kind; it never contains the request body or credentials.
  console.error(`PayPal ${operation} failed (${err.kind}): ${err.message}`, err.kind === "auth" ? "Check PAYPAL_CLIENT_ID/SECRET." : "");
  return { kind: "unknown" };
}

function logRefusal(operation: string, r: Refusal) {
  console.warn(`PayPal ${operation} refused: ${r.status} ${r.issue ?? ""} debug_id=${r.debugId ?? "?"}`);
}

export type CreateOrderOutcome =
  | { kind: "created"; orderId: string }
  | ({ kind: "refused" } & Refusal)
  | { kind: "unknown" };

/**
 * Creates a CAPTURE order paying `payeeEmail`: the nonprofit for a donation
 * (so money goes straight to it), the platform for a fee. `requestId` makes
 * the call idempotent: PayPal returns the same order if it's replayed.
 */
export async function createOrder(input: {
  requestId: string;
  amountCents: number;
  payeeEmail: string;
  description: string;
  customId: string;
}): Promise<CreateOrderOutcome> {
  try {
    const result = await getPayPalClient()
      .orders.createOrder({
        payPalRequestId: input.requestId,
        prefer: "return=representation",
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              amount: { currencyCode: CURRENCY, value: centsToValue(input.amountCents) },
              payee: { emailAddress: input.payeeEmail },
              description: input.description.slice(0, 127), // PayPal's limit
              customId: input.customId,
            },
          ],
          paymentSource: {
            paypal: {
              experienceContext: {
                brandName: "Bono",
                // A donation ships nothing, so don't ask for an address.
                shippingPreference: PayPalWalletContextShippingPreference.NoShipping,
                userAction: PayPalExperienceUserAction.PayNow,
              },
            },
          },
        },
      })
      .asApiResult();

    if (!result.ok) {
      const r = refusal(result.status, result.payload);
      logRefusal("createOrder", r);
      return { kind: "refused", ...r };
    }
    // Every Order member is optional in the model; without an id we can't go on.
    if (!result.value.id) {
      console.error("PayPal createOrder returned no order id");
      return { kind: "unknown" };
    }
    return { kind: "created", orderId: result.value.id };
  } catch (err) {
    return noAnswer(err, "createOrder");
  }
}

export type CaptureDetails = {
  captureId: string;
  status: string;
  amountCents: number;
  currency: string;
  /** Lowercased email of the PayPal account that paid, when PayPal reports it. */
  payerEmail?: string;
};

export type CaptureOutcome =
  | ({ kind: "captured" } & CaptureDetails)
  | { kind: "declined" } // the buyer's funding source was declined; they can pick another
  | { kind: "alreadyCaptured" }
  | ({ kind: "refused" } & Refusal)
  | { kind: "unknown" };

// The single capture of our single purchase unit.
function captureFrom(order: Order): CaptureDetails | null {
  const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0];
  if (!capture?.id || !capture.status || !capture.amount) return null;
  return {
    captureId: capture.id,
    status: capture.status,
    amountCents: Math.round(Number(capture.amount.value) * 100),
    currency: capture.amount.currencyCode,
    ...(order.payer?.emailAddress && { payerEmail: order.payer.emailAddress.toLowerCase() }),
  };
}

/** Captures an approved order. `requestId` makes a double click or a retry replay safely. */
export async function captureOrder(orderId: string, requestId: string): Promise<CaptureOutcome> {
  try {
    const result = await getPayPalClient()
      .orders.captureOrder({
        id: orderId,
        payPalRequestId: requestId,
        // The default "return=minimal" response leaves out the capture itself.
        prefer: "return=representation",
        // PayPal answers 415 when there's no JSON body at all, so send an empty one.
        body: {},
      })
      .asApiResult();

    if (!result.ok) {
      const r = refusal(result.status, result.payload);
      if (r.status === 422 && r.issue === "INSTRUMENT_DECLINED") return { kind: "declined" };
      if (r.status === 422 && r.issue === "ORDER_ALREADY_CAPTURED") return { kind: "alreadyCaptured" };
      logRefusal("captureOrder", r);
      return { kind: "refused", ...r };
    }
    const details = captureFrom(result.value);
    if (!details) {
      // A 2xx without a readable capture: money may have moved. The caller reconciles.
      console.error(`PayPal captureOrder ${orderId} returned no readable capture`);
      return { kind: "unknown" };
    }
    return { kind: "captured", ...details };
  } catch (err) {
    return noAnswer(err, "captureOrder");
  }
}

/** Reads an order's capture, to settle a capture whose outcome we didn't see. */
export async function getOrderCapture(orderId: string): Promise<CaptureDetails | null | "unknown"> {
  try {
    const result = await getPayPalClient().orders.getOrder({ id: orderId }).asApiResult();
    if (!result.ok) {
      logRefusal("getOrder", refusal(result.status, result.payload));
      return "unknown";
    }
    return captureFrom(result.value);
  } catch (err) {
    return noAnswer(err, "getOrder").kind;
  }
}
