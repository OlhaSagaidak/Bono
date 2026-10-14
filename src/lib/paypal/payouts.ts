import "server-only";
import { centsToValue } from "./orders";
import { paypalRest } from "./rest";

// PayPal Payouts v1 (not in the generated SDK). Field names follow PayPal's
// OpenAPI spec for Payouts; see pay-pal-server-sdk-plan.md, slice 4.

export type PayoutItemStatus =
  | "SUCCESS" | "FAILED" | "PENDING" | "UNCLAIMED" | "RETURNED" | "ONHOLD" | "BLOCKED" | "REFUNDED" | "REVERSED";

type CreateResponse = { batch_header: { payout_batch_id: string; batch_status: string } };
type BatchResponse = {
  batch_header: { payout_batch_id: string; batch_status: string };
  items?: { payout_item_id: string; transaction_status: PayoutItemStatus; errors?: { name?: string; message?: string } }[];
};

/**
 * Sends one payout. `id` becomes the sender_batch_id: PayPal pays a given
 * sender_batch_id at most once within 30 days, so retrying is safe.
 */
export async function createPayout(input: { id: string; receiverEmail: string; amountCents: number; note: string }) {
  const result = await paypalRest<CreateResponse>("POST", "/v1/payments/payouts", {
    sender_batch_header: {
      sender_batch_id: input.id,
      email_subject: "You received a matching gift through Bono",
      email_message: input.note,
    },
    items: [
      {
        recipient_type: "EMAIL",
        receiver: input.receiverEmail,
        amount: { value: centsToValue(input.amountCents), currency: "USD" },
        sender_item_id: input.id,
        note: input.note,
        purpose: "DONATIONS",
      },
    ],
  });
  if (!result.ok) {
    // A repeated sender_batch_id is refused with a link to the original payout:
    // that means it was already sent (e.g. we crashed before saving), so adopt it.
    const original = result.body?.links
      ?.map((l) => l.href?.match(/\/v1\/payments\/payouts\/([A-Z0-9]+)$/)?.[1])
      .find(Boolean);
    if (original) return { kind: "created" as const, batchId: original, batchStatus: "UNKNOWN" };
    return { kind: "refused" as const, status: result.status, name: result.body?.name, debugId: result.body?.debug_id };
  }
  return { kind: "created" as const, batchId: result.body.batch_header.payout_batch_id, batchStatus: result.body.batch_header.batch_status };
}

/** The one item of a batch we created, with PayPal's current status. */
export async function getPayoutItem(batchId: string) {
  const result = await paypalRest<BatchResponse>("GET", `/v1/payments/payouts/${encodeURIComponent(batchId)}`);
  if (!result.ok) return null;
  const item = result.body.items?.[0];
  return item ? { itemId: item.payout_item_id, status: item.transaction_status, error: item.errors?.name } : null;
}
