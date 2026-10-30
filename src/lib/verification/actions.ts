"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { nonprofitProfiles, verificationFees } from "@/db/schema";
import { formText, type FormState } from "@/lib/forms";
import { captureOrder, createOrder, getOrderCapture, type CaptureDetails } from "@/lib/paypal/orders";
import { paypalReturnUrls } from "@/lib/paypal/return-urls";
import { platformPayeeEmail, verificationFeeCents } from "./config";
import { findEin, formatEin, MIN_EXEMPT_MONTHS, namesMatch, normalizeEin, verifiableFrom } from "./ein";

const longDate = (ymd: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${ymd}T00:00:00Z`));
import { completeVerificationIfReady, getPaidFee } from "./queries";
import { settleFee } from "./settle";

// Nonprofit verification, in two steps:
// 1. checkEinAction: the EIN must be a 501(c)(3) in the IRS records (looked up
//    on demand) or in the labeled demo registry, under a consistent name, and
//    tax-exempt for at least MIN_EXEMPT_MONTHS (by its IRS ruling date).
// 2. The one-time fee, paid to the platform through PayPal from the same
//    PayPal account the nonprofit receives donations in.

const TRY_AGAIN = "Something went wrong on our side. You weren't charged. Please try again.";

async function currentNonprofit() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "nonprofit") return null;
  return db.query.nonprofitProfiles.findFirst({ where: eq(nonprofitProfiles.userId, session.user.id) });
}

export async function checkEinAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await currentNonprofit();
  if (!profile) return { error: "Only nonprofits can be verified." };
  if (profile.verifiedAt) return { error: "Your nonprofit is already verified." };

  const values = { ein: formText(formData, "ein") };
  const ein = normalizeEin(values.ein);
  if (!ein) return { fieldErrors: { ein: ["Enter the 9-digit EIN, like 12-3456789."] }, values };

  const record = await findEin(ein);
  if (record === "unavailable") {
    return { error: "We couldn't reach the IRS records just now. Please try again in a few minutes.", values };
  }
  if (!record) {
    return {
      fieldErrors: { ein: [`We couldn't find ${formatEin(ein)} among organizations the IRS recognizes as tax-exempt.`] },
      values,
    };
  }
  if (!record.eligible) {
    return {
      fieldErrors: {
        ein: [
          `The IRS lists "${record.name}", but not as a 501(c)(3) charity that can receive tax-deductible donations, so Bono can't verify it.`,
        ],
      },
      values,
    };
  }
  if (!namesMatch(profile.name, record.name)) {
    return {
      fieldErrors: {
        ein: [
          `That EIN belongs to "${record.name}", which doesn't match "${profile.name}". Check the EIN, or edit your organization name to match your legal name.`,
        ],
      },
      values,
    };
  }

  // Only organizations that have been tax-exempt for a while can be verified.
  if (!record.rulingDate) {
    return {
      fieldErrors: {
        ein: [`The IRS record for "${record.name}" doesn't say when it became tax-exempt, so Bono can't confirm the ${MIN_EXEMPT_MONTHS}-month minimum.`],
      },
      values,
    };
  }
  const from = verifiableFrom(record.rulingDate);
  if (from > new Date().toISOString().slice(0, 10)) {
    return {
      fieldErrors: {
        ein: [
          `${record.source === "irs" ? `The IRS recognized "${record.name}" as tax-exempt on` : `Bono's demo registry lists "${record.name}" as tax-exempt since`} ${longDate(record.rulingDate)}. Bono verifies organizations after ${MIN_EXEMPT_MONTHS} months of tax-exempt status, so you can get verified from ${longDate(from)}. Until then you can use Bono like a supporter.`,
        ],
      },
      values,
    };
  }

  const takenBy = await db.query.nonprofitProfiles.findFirst({
    where: and(eq(nonprofitProfiles.ein, ein), ne(nonprofitProfiles.userId, profile.userId)),
    columns: { userId: true },
  });
  if (takenBy) {
    return { fieldErrors: { ein: ["Another Bono account already uses this EIN."] }, values };
  }

  await db
    .update(nonprofitProfiles)
    .set({ ein, einSource: record.source, einCheckedAt: new Date(), einRulingDate: record.rulingDate })
    .where(eq(nonprofitProfiles.userId, profile.userId));
  // A fee may already be paid (e.g. the EIN was re-checked): finish if it qualifies.
  await completeVerificationIfReady(profile.userId);
  revalidatePath("/verify");
  return {};
}

/** `redirect`: phones go to PayPal in the same tab and come back to /paypal/return. */
export async function createVerificationFeeOrderAction(
  options: { redirect?: boolean } = {},
): Promise<{ orderId: string; approveUrl?: string } | { error: string }> {
  const profile = await currentNonprofit();
  if (!profile) return { error: "Only nonprofits can be verified." };
  if (profile.verifiedAt) return { error: "Your nonprofit is already verified." };
  if (!profile.ein) return { error: "Check your EIN first." };
  // Never charge twice: a paid fee only needs the donation email to match.
  if (await getPaidFee(profile.userId)) return { error: "Your fee is already paid. Reload the page to finish." };

  const amountCents = verificationFeeCents();
  const [fee] = await db
    .insert(verificationFees)
    .values({ nonprofitId: profile.userId, amountCents })
    .returning({ id: verificationFees.id });

  const outcome = await createOrder({
    requestId: `verification-create-${fee.id}`,
    amountCents,
    payeeEmail: platformPayeeEmail(),
    description: "Bono nonprofit verification fee",
    customId: fee.id,
    ...(options.redirect ? { returnTo: await paypalReturnUrls("fee", "/verify") } : {}),
  });
  if (outcome.kind !== "created") {
    await db.update(verificationFees).set({ status: "failed" }).where(eq(verificationFees.id, fee.id));
    return { error: TRY_AGAIN };
  }
  await db.update(verificationFees).set({ paypalOrderId: outcome.orderId }).where(eq(verificationFees.id, fee.id));
  return { orderId: outcome.orderId, ...(outcome.approveUrl ? { approveUrl: outcome.approveUrl } : {}) };
}

export type CaptureFeeResult = { verified: boolean } | { declined: true } | { error: string };

export async function captureVerificationFeeAction(orderId: string): Promise<CaptureFeeResult> {
  const profile = await currentNonprofit();
  if (!profile) return { error: "Only nonprofits can be verified." };
  if (typeof orderId !== "string" || !/^[A-Z0-9]{1,64}$/.test(orderId)) return { error: "That payment wasn't found." };

  const fee = await db.query.verificationFees.findFirst({
    where: and(eq(verificationFees.paypalOrderId, orderId), eq(verificationFees.nonprofitId, profile.userId)),
  });
  if (!fee) return { error: "That payment wasn't found." };
  if (fee.status === "completed") return { verified: await completeVerificationIfReady(profile.userId) };
  if (fee.status === "failed") return { error: TRY_AGAIN };

  const outcome = await captureOrder(orderId, `verification-capture-${fee.id}`);
  let capture: CaptureDetails | null = null;
  switch (outcome.kind) {
    case "captured":
      capture = outcome;
      break;
    case "declined":
      return { declined: true };
    case "alreadyCaptured":
    case "unknown": {
      const found = await getOrderCapture(orderId);
      if (found && found !== "unknown") capture = found;
      break;
    }
    case "refused":
      await db.update(verificationFees).set({ status: "failed" }).where(eq(verificationFees.id, fee.id));
      return { error: "PayPal couldn't complete this payment. You weren't charged. Please try again." };
  }
  if (!capture) {
    return {
      error: "We couldn't confirm your payment with PayPal yet. Please don't pay again; reload this page in a minute.",
    };
  }

  const settled = await settleFee(fee.id, capture);
  if (!settled) return { error: TRY_AGAIN };
  if (settled.status === "pending") return { error: "PayPal is still processing your payment. Reload this page in a few minutes." };
  if (settled.status !== "completed") return { error: "PayPal couldn't complete this payment. Please try another way to pay." };
  return { verified: settled.verified };
}
