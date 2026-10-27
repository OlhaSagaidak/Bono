"use server";

import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { campaignNonprofits, campaigns, causes, nonprofitProfiles, sponsorProfiles } from "@/db/schema";
import { formText, type FormState } from "@/lib/forms";
import { captureOrder, createOrder, getOrderCapture, paymentStatusFrom, type CaptureDetails } from "@/lib/paypal/orders";
import { paypalReturnUrls } from "@/lib/paypal/return-urls";
import { platformPayeeEmail } from "@/lib/verification/config";
import { campaignSchema } from "./validation";

// Sponsors create matching campaigns, then fund their pool by paying the
// platform through PayPal (Orders v2, same helpers as donations). Matching
// itself happens in lib/matching/matching.ts.

const TRY_AGAIN = "Something went wrong on our side. You weren't charged. Please try again.";

async function currentSponsor() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "sponsor") return null;
  return db.query.sponsorProfiles.findFirst({ where: eq(sponsorProfiles.userId, session.user.id) });
}

export async function createCampaignAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const sponsor = await currentSponsor();
  if (!sponsor) return { error: "Only sponsors can create campaigns." };

  const values = {
    name: formText(formData, "name"),
    target: formText(formData, "target"),
    causeSlug: formText(formData, "causeSlug"),
    nonprofitIds: formData.getAll("nonprofitIds").map(String),
    ratioPercent: formText(formData, "ratioPercent"),
    capCents: formText(formData, "cap"),
    poolCents: formText(formData, "pool"),
    startsAt: formText(formData, "startsAt"),
    endsAt: formText(formData, "endsAt"),
  };
  const parsed = campaignSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
    // Form field names differ from schema keys for the two amounts.
    return { fieldErrors: { ...fieldErrors, cap: fieldErrors.capCents, pool: fieldErrors.poolCents }, values };
  }
  const c = parsed.data;

  // Only real causes and verified nonprofits can be matched.
  if (c.target === "cause" && !(await db.query.causes.findFirst({ where: eq(causes.slug, c.causeSlug) }))) {
    return { fieldErrors: { causeSlug: ["Choose a cause."] }, values };
  }
  const nonprofitIds = [...new Set(c.nonprofitIds)];
  if (c.target === "nonprofits") {
    const found = await db
      .select({ id: nonprofitProfiles.userId })
      .from(nonprofitProfiles)
      .where(and(inArray(nonprofitProfiles.userId, nonprofitIds), isNotNull(nonprofitProfiles.verifiedAt)));
    if (found.length !== nonprofitIds.length) return { fieldErrors: { nonprofitIds: ["Choose verified nonprofits only."] }, values };
  }

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(campaigns)
      .values({
        sponsorId: sponsor.userId,
        name: c.name,
        causeSlug: c.target === "cause" ? c.causeSlug : null,
        ratioPercent: c.ratioPercent,
        capCents: c.capCents,
        poolCents: c.poolCents,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
      })
      .returning({ id: campaigns.id });
    if (c.target === "nonprofits") {
      await tx.insert(campaignNonprofits).values(nonprofitIds.map((nonprofitId) => ({ campaignId: row.id, nonprofitId })));
    }
    return row.id;
  });
  redirect(`/campaigns/${id}`);
}

async function ownCampaign(sponsorId: string, campaignId: string) {
  if (!z.uuid().safeParse(campaignId).success) return null;
  return db.query.campaigns.findFirst({
    where: and(eq(campaigns.id, campaignId), eq(campaigns.sponsorId, sponsorId)),
  });
}

/** `redirect`: phones go to PayPal in the same tab and come back to /paypal/return. */
export async function createCampaignFundingOrderAction(
  campaignId: string,
  options: { redirect?: boolean } = {},
): Promise<{ orderId: string; approveUrl?: string } | { error: string }> {
  const sponsor = await currentSponsor();
  if (!sponsor) return { error: "Only sponsors can fund campaigns." };
  const campaign = await ownCampaign(sponsor.userId, campaignId);
  if (!campaign) return { error: "That campaign wasn't found." };
  if (campaign.status === "funded") return { error: "This campaign is already funded." };

  // A fresh order per attempt; the campaign keeps the latest one.
  const attempt = crypto.randomUUID();
  const outcome = await createOrder({
    requestId: `campaign-create-${attempt}`,
    amountCents: campaign.poolCents,
    payeeEmail: platformPayeeEmail(),
    description: `Bono matching pool: ${campaign.name}`,
    customId: campaign.id,
    ...(options.redirect ? { returnTo: await paypalReturnUrls("campaign", `/campaigns/${campaign.id}`) } : {}),
  });
  if (outcome.kind !== "created") return { error: TRY_AGAIN };
  await db.update(campaigns).set({ paypalOrderId: outcome.orderId }).where(eq(campaigns.id, campaign.id));
  return { orderId: outcome.orderId, ...(outcome.approveUrl ? { approveUrl: outcome.approveUrl } : {}) };
}

export async function captureCampaignFundingAction(orderId: string): Promise<{ funded: true } | { declined: true } | { error: string }> {
  const sponsor = await currentSponsor();
  if (!sponsor) return { error: "Only sponsors can fund campaigns." };
  if (typeof orderId !== "string" || !/^[A-Z0-9]{1,64}$/.test(orderId)) return { error: "That payment wasn't found." };
  const campaign = await db.query.campaigns.findFirst({
    where: and(eq(campaigns.paypalOrderId, orderId), eq(campaigns.sponsorId, sponsor.userId)),
  });
  if (!campaign) return { error: "That payment wasn't found." };
  if (campaign.status === "funded") return { funded: true };

  const outcome = await captureOrder(orderId, `campaign-capture-${campaign.id}-${orderId}`);
  let capture: CaptureDetails | null = null;
  if (outcome.kind === "captured") capture = outcome;
  else if (outcome.kind === "declined") return { declined: true };
  else if (outcome.kind === "refused") return { error: "PayPal couldn't complete this payment. You weren't charged. Please try again." };
  else {
    const found = await getOrderCapture(orderId);
    if (found && found !== "unknown") capture = found;
  }
  if (!capture) return { error: "We couldn't confirm your payment with PayPal yet. Please don't pay again; reload in a minute." };
  if (paymentStatusFrom(capture.status) !== "completed") return { error: "PayPal is still processing this payment. Reload in a few minutes." };
  if (capture.amountCents !== campaign.poolCents) {
    console.error(`Campaign ${campaign.id}: captured ${capture.amountCents} but pool is ${campaign.poolCents}`);
  }

  await db
    .update(campaigns)
    // The pool is what PayPal actually captured.
    .set({ status: "funded", paypalCaptureId: capture.captureId, poolCents: capture.amountCents, fundedAt: new Date() })
    .where(eq(campaigns.id, campaign.id));
  revalidatePath(`/campaigns/${campaign.id}`);
  revalidatePath("/campaigns");
  revalidatePath("/feed");
  return { funded: true };
}
