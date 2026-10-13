import "server-only";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { verificationFees } from "@/db/schema";
import { paymentStatusFrom, type CaptureDetails, type PaymentStatus } from "@/lib/paypal/orders";
import { completeVerificationIfReady } from "./queries";

/**
 * Records what PayPal says happened to a verification fee, then completes the
 * nonprofit's verification if the fee qualifies. Used right after capturing
 * and again by the webhook, so it must be safe to run twice.
 */
export async function settleFee(
  feeId: string,
  capture: CaptureDetails,
): Promise<{ status: PaymentStatus; verified: boolean } | null> {
  const status = paymentStatusFrom(capture.status);
  const [row] = await db
    .update(verificationFees)
    .set({
      status,
      paypalCaptureId: capture.captureId,
      amountCents: capture.amountCents,
      currency: capture.currency,
      // getOrder reports the payer too; never overwrite a known payer with "unknown".
      ...(capture.payerEmail && { payerEmail: capture.payerEmail }),
      completedAt:
        status === "completed" || status === "refunded"
          ? sql`coalesce(${verificationFees.completedAt}, now())`
          : null,
    })
    .where(eq(verificationFees.id, feeId))
    .returning({ nonprofitId: verificationFees.nonprofitId });
  if (!row) return null;

  // A refunded fee doesn't undo verification: Bono never refunds fees itself,
  // so that would be a deliberate exception handled by hand.
  const verified = await completeVerificationIfReady(row.nonprofitId);
  revalidatePath("/verify");
  revalidatePath(`/nonprofits/${row.nonprofitId}`);
  return { status, verified };
}
