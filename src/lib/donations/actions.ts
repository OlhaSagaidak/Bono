"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { donations, nonprofitProfiles, posts } from "@/db/schema";
import { captureOrder, createOrder, getOrderCapture, type CaptureDetails } from "@/lib/paypal/orders";
import { supporterTierAfterGift } from "@/lib/badges/queries";
import { paypalReturnUrls } from "@/lib/paypal/return-urls";
import { amountSchema } from "./amounts";
import { settleDonation } from "./settle";
import { matchDonation, type MatchInfo } from "@/lib/matching/matching";

// The two halves of a donation, called by the PayPal button in the browser:
// create an order (before the PayPal window opens) and capture it (after the
// donor approves). Both run here on the server; the browser only ever passes
// ids and the amount the donor picked, and the amount is re-validated.

const TRY_AGAIN = "Something went wrong on our side. You weren't charged. Please try again.";

/** approveUrl is set in the phone redirect flow: where to send the donor. */
export type CreateDonationResult = { orderId: string; approveUrl?: string } | { error: string };

const createInput = z.object({
  nonprofitId: z.uuid(),
  postId: z.uuid().nullable(),
  amount: amountSchema,
  redirect: z.boolean().optional(),
});

export async function createDonationOrderAction(input: {
  nonprofitId: string;
  postId: string | null;
  amount: string;
  /** Phones: PayPal in the same tab, then back to /paypal/return (see lib/paypal/return-urls.ts). */
  redirect?: boolean;
}): Promise<CreateDonationResult> {
  const session = await auth();
  if (!session) return { error: "Log in to donate." };

  const parsed = createInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? TRY_AGAIN };
  const { nonprofitId, postId, amount: amountCents, redirect } = parsed.data;

  if (nonprofitId === session.user.id) return { error: "You can't donate to your own organization." };

  // Only verified nonprofits can receive money (and the payee comes from our
  // database, never from the browser).
  const nonprofit = await db.query.nonprofitProfiles.findFirst({
    where: eq(nonprofitProfiles.userId, nonprofitId),
    columns: { name: true, paypalPayeeEmail: true, verifiedAt: true },
  });
  if (!nonprofit?.verifiedAt) return { error: "This nonprofit can't receive donations right now." };

  // A post id only counts if it really is this nonprofit's post.
  const post = postId
    ? await db.query.posts.findFirst({
        where: and(eq(posts.id, postId), eq(posts.nonprofitId, nonprofitId)),
        columns: { id: true },
      })
    : undefined;

  // Record the attempt first, so its id can make the PayPal call idempotent.
  const [donation] = await db
    .insert(donations)
    .values({
      donorId: session.user.id,
      nonprofitId,
      postId: post?.id ?? null,
      amountCents,
      payeeEmail: nonprofit.paypalPayeeEmail,
    })
    .returning({ id: donations.id });

  const outcome = await createOrder({
    requestId: `donation-create-${donation.id}`,
    amountCents,
    payeeEmail: nonprofit.paypalPayeeEmail,
    description: `Donation to ${nonprofit.name} via Bono`,
    customId: donation.id,
    ...(redirect ? { returnTo: await paypalReturnUrls("donation", post ? `/posts/${post.id}` : `/nonprofits/${nonprofitId}`) } : {}),
  });

  if (outcome.kind !== "created") {
    await db.update(donations).set({ status: "failed" }).where(eq(donations.id, donation.id));
    return { error: TRY_AGAIN };
  }
  await db.update(donations).set({ paypalOrderId: outcome.orderId }).where(eq(donations.id, donation.id));
  return { orderId: outcome.orderId, ...(outcome.approveUrl ? { approveUrl: outcome.approveUrl } : {}) };
}

/** tier: the donor's supporter badge with this nonprofit after a completed gift (isNew: it just went up). */
export type DonationTier = { label: string; isNew: boolean } | null;

export type CaptureDonationResult =
  | { status: "completed" | "pending"; amountCents: number; match: MatchInfo | null; tier: DonationTier }
  | { declined: true }
  | { error: string };

export async function captureDonationAction(orderId: string): Promise<CaptureDonationResult> {
  const session = await auth();
  if (!session) return { error: "Log in to donate." };
  if (typeof orderId !== "string" || !/^[A-Z0-9]{1,64}$/.test(orderId)) {
    return { error: "That payment wasn't found." };
  }

  // Only the donor who created the order may capture it.
  const donation = await db.query.donations.findFirst({
    where: and(eq(donations.paypalOrderId, orderId), eq(donations.donorId, session.user.id)),
  });
  if (!donation) return { error: "That payment wasn't found." };

  // Already settled (a double click, or a retry after a lost response).
  if (donation.status === "completed" || donation.status === "pending") {
    return {
      status: donation.status,
      amountCents: donation.amountCents,
      match: await matchDonation(donation.id),
      tier: donation.status === "completed" ? await tierFor(donation) : null,
    };
  }
  if (donation.status === "failed") return { error: TRY_AGAIN };

  const outcome = await captureOrder(orderId, `donation-capture-${donation.id}`);

  switch (outcome.kind) {
    case "captured":
      return finish(donation, outcome);

    case "declined":
      // The order stays open, so the donor can choose another way to pay.
      return { declined: true };

    case "alreadyCaptured":
    case "unknown": {
      // We don't know (or don't remember) what happened: ask PayPal.
      const capture = await getOrderCapture(orderId);
      if (capture && capture !== "unknown") return finish(donation, capture);
      return {
        error:
          "We couldn't confirm your payment with PayPal yet. Please don't pay again; check your PayPal account or refresh in a minute.",
      };
    }

    case "refused":
      await db.update(donations).set({ status: "failed" }).where(eq(donations.id, donation.id));
      return { error: "PayPal couldn't complete this payment. You weren't charged. Please try again." };
  }
}

type DonationRow = { id: string; donorId: string; nonprofitId: string; amountCents: number };

async function finish(donation: DonationRow, capture: CaptureDetails): Promise<CaptureDonationResult> {
  const settled = await settleDonation(donation.id, capture);
  if (!settled) return { error: TRY_AGAIN };
  if (settled.status === "completed" || settled.status === "pending") {
    return {
      status: settled.status,
      amountCents: settled.amountCents,
      match: settled.match,
      tier: settled.status === "completed" ? await tierFor(donation) : null,
    };
  }
  return { error: "PayPal couldn't complete this payment. Please try another way to pay." };
}

/** The badge line for the thank-you; a failure here never spoils a completed donation. */
async function tierFor(donation: DonationRow): Promise<DonationTier> {
  const result = await supporterTierAfterGift(donation.donorId, donation.nonprofitId, donation.amountCents).catch(() => null);
  return result ? { label: result.label, isNew: result.isNew } : null;
}
