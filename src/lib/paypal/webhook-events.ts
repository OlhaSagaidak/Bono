import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import { capturedPaymentSchema, refundSchema } from "pay-pal-server-sdk";
import { z } from "zod";
import { db } from "@/db";
import { donations, matches, verificationFees } from "@/db/schema";
import { settleDonation } from "@/lib/donations/settle";
import { refreshMatchPayout } from "@/lib/matching/matching";
import { settleFee } from "@/lib/verification/settle";
import { getOrderCapture } from "./orders";

// What a (signature-verified) PayPal webhook event means for Bono. An event is
// only used to find our record; the outcome is re-read from PayPal (getOrder),
// so a webhook can never set a state PayPal doesn't report. Throws when PayPal
// can't be reached, so the caller can ask PayPal to retry.

const CAPTURE_EVENTS = new Set([
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.PENDING",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.DECLINED",
]);

// A payout item's resource, per PayPal's Payouts spec ("show payout item").
const payoutItemSchema = z.object({
  payout_batch_id: z.string(),
  sender_batch_id: z.string().optional(),
  payout_item: z.object({ sender_item_id: z.string().optional() }).optional(),
});

/** Payout events: find the match (our id is the sender_batch_id), then ask PayPal how the payout is doing. */
async function handlePayoutEvent(resource: unknown): Promise<{ text: string; resourceId?: string }> {
  const parsed = payoutItemSchema.safeParse(resource);
  if (!parsed.success) return { text: "ignored: unreadable payout item" };
  const { payout_batch_id: batchId, sender_batch_id, payout_item } = parsed.data;
  const ourId = [sender_batch_id, payout_item?.sender_item_id].find((id) => id && uuid.safeParse(id).success);

  const [match] = await db
    .select({ id: matches.id, status: matches.status })
    .from(matches)
    .where(ourId ? or(eq(matches.id, ourId), eq(matches.payoutBatchId, batchId)) : eq(matches.payoutBatchId, batchId));
  if (!match) return { text: "ignored: not a Bono payout", resourceId: batchId };
  if (match.status === "paid" || match.status === "failed") return { text: `match already ${match.status}`, resourceId: batchId };

  // Record the batch id if the webhook beat our own bookkeeping.
  await db.update(matches).set({ payoutBatchId: batchId }).where(and(eq(matches.id, match.id), isNull(matches.payoutBatchId)));
  const result = await refreshMatchPayout(match.id, batchId);
  if (result === "unknown") throw new Error(`couldn't read payout ${batchId} from PayPal`);
  return { text: `match payout ${result}`, resourceId: batchId };
}

export async function handlePayPalEvent(eventType: string, resource: unknown): Promise<{ text: string; resourceId?: string }> {
  if (eventType.startsWith("PAYMENT.PAYOUTS-ITEM.")) return handlePayoutEvent(resource);

  let ids: { customId?: string; orderId?: string; captureId?: string };
  if (CAPTURE_EVENTS.has(eventType)) {
    const capture = decode(() => capturedPaymentSchema.decode(resource));
    if (!capture) return { text: "ignored: unreadable capture" };
    ids = { customId: capture.customId, orderId: capture.supplementaryData?.relatedIds?.orderId, captureId: capture.id };
  } else if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
    const refund = decode(() => refundSchema.decode(resource));
    if (!refund) return { text: "ignored: unreadable refund" };
    // A refund points back to its capture: links[rel=up] = .../v2/payments/captures/{id}
    const up = refund.links?.find((l) => l.rel === "up")?.href;
    ids = { customId: refund.customId, captureId: up?.match(/\/captures\/([A-Z0-9]+)$/)?.[1] };
  } else {
    return { text: `ignored: ${eventType} isn't handled` };
  }

  const target = await findPayment(ids);
  if (!target) return { text: "ignored: not a Bono payment", resourceId: ids.captureId ?? ids.orderId };

  const capture = await getOrderCapture(target.orderId);
  if (capture === "unknown") throw new Error(`couldn't read order ${target.orderId} from PayPal`);
  if (!capture) return { text: `ignored: order ${target.orderId} has no capture`, resourceId: target.orderId };

  if (target.kind === "donation") {
    const settled = await settleDonation(target.id, capture);
    return { text: `donation ${settled?.status ?? "missing"}`, resourceId: target.orderId };
  }
  const settled = await settleFee(target.id, capture);
  return {
    text: `verification fee ${settled?.status ?? "missing"}${settled?.verified ? ", nonprofit verified" : ""}`,
    resourceId: target.orderId,
  };
}

function decode<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

const uuid = z.uuid();

/** Our donation or fee for these PayPal ids, with its order id. */
async function findPayment(ids: { customId?: string; orderId?: string; captureId?: string }) {
  const customId = ids.customId && uuid.safeParse(ids.customId).success ? ids.customId : undefined;
  const match = <T extends typeof donations | typeof verificationFees>(t: T) =>
    or(
      ...[
        customId && eq(t.id, customId),
        ids.orderId && eq(t.paypalOrderId, ids.orderId),
        ids.captureId && eq(t.paypalCaptureId, ids.captureId),
      ].filter((c) => !!c),
    );
  if (!customId && !ids.orderId && !ids.captureId) return null;

  const donation = await db.query.donations.findFirst({ where: match(donations), columns: { id: true, paypalOrderId: true } });
  if (donation?.paypalOrderId) return { kind: "donation" as const, id: donation.id, orderId: donation.paypalOrderId };
  const fee = await db.query.verificationFees.findFirst({
    where: match(verificationFees),
    columns: { id: true, paypalOrderId: true },
  });
  if (fee?.paypalOrderId) return { kind: "fee" as const, id: fee.id, orderId: fee.paypalOrderId };
  return null;
}
