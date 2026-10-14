import "server-only";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { donations } from "@/db/schema";
import { matchDonation, runPayoutQueue, type MatchInfo } from "@/lib/matching/matching";
import { paymentStatusFrom, type CaptureDetails, type PaymentStatus } from "@/lib/paypal/orders";

/**
 * Records what PayPal says happened to a donation's capture. Used right after
 * capturing and again by the webhook, so it must be safe to run twice.
 */
export async function settleDonation(
  donationId: string,
  capture: CaptureDetails,
): Promise<{ status: PaymentStatus; amountCents: number; match: MatchInfo | null } | null> {
  const status = paymentStatusFrom(capture.status);
  // PayPal's captured amount is the truth. It can't differ from ours (the
  // order was built here), but if it ever did, record what actually moved.
  const [row] = await db
    .update(donations)
    .set({
      status,
      paypalCaptureId: capture.captureId,
      amountCents: capture.amountCents,
      currency: capture.currency,
      // Keep the original completion time on a re-run or a later refund.
      completedAt:
        status === "completed" || status === "refunded" ? sql`coalesce(${donations.completedAt}, now())` : null,
    })
    .where(eq(donations.id, donationId))
    .returning({ amountCents: donations.amountCents, nonprofitId: donations.nonprofitId });
  if (!row) return null;

  revalidatePath(`/nonprofits/${row.nonprofitId}`);

  // A completed donation may trigger a sponsor's matching gift. Recording the
  // match is quick (database only); the PayPal payout itself runs after the
  // response is sent, never inside the donor's request.
  const match = status === "completed" ? await matchDonation(donationId) : null;
  if (match) after(() => runPayoutQueue().catch((error) => console.error("Payout queue failed:", error)));
  return { status, amountCents: row.amountCents, match };
}
