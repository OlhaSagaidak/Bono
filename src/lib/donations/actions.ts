"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { donations, nonprofitProfiles, posts } from "@/db/schema";
import { captureOrder, createOrder, getOrderCapture, type CaptureDetails } from "@/lib/paypal/orders";
import { amountSchema } from "./amounts";

// The two halves of a donation, called by the PayPal button in the browser:
// create an order (before the PayPal window opens) and capture it (after the
// donor approves). Both run here on the server; the browser only ever passes
// ids and the amount the donor picked, and the amount is re-validated.

const TRY_AGAIN = "Something went wrong on our side. You weren't charged. Please try again.";

export type CreateDonationResult = { orderId: string } | { error: string };

const createInput = z.object({
  nonprofitId: z.uuid(),
  postId: z.uuid().nullable(),
  amount: amountSchema,
});

export async function createDonationOrderAction(input: {
  nonprofitId: string;
  postId: string | null;
  amount: string;
}): Promise<CreateDonationResult> {
  const session = await auth();
  if (!session) return { error: "Log in to donate." };

  const parsed = createInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? TRY_AGAIN };
  const { nonprofitId, postId, amount: amountCents } = parsed.data;

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
  });

  if (outcome.kind !== "created") {
    await db.update(donations).set({ status: "failed" }).where(eq(donations.id, donation.id));
    return { error: TRY_AGAIN };
  }
  await db.update(donations).set({ paypalOrderId: outcome.orderId }).where(eq(donations.id, donation.id));
  return { orderId: outcome.orderId };
}

export type CaptureDonationResult =
  | { status: "completed" | "pending"; amountCents: number }
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
    return { status: donation.status, amountCents: donation.amountCents };
  }
  if (donation.status === "failed") return { error: TRY_AGAIN };

  const outcome = await captureOrder(orderId, `donation-capture-${donation.id}`);

  switch (outcome.kind) {
    case "captured":
      return settle(donation.id, donation.nonprofitId, outcome);

    case "declined":
      // The order stays open, so the donor can choose another way to pay.
      return { declined: true };

    case "alreadyCaptured":
    case "unknown": {
      // We don't know (or don't remember) what happened: ask PayPal.
      const capture = await getOrderCapture(orderId);
      if (capture && capture !== "unknown") return settle(donation.id, donation.nonprofitId, capture);
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

async function settle(
  donationId: string,
  nonprofitId: string,
  capture: CaptureDetails,
): Promise<CaptureDonationResult> {
  const status =
    capture.status === "COMPLETED" ? "completed" : capture.status === "PENDING" ? "pending" : "failed";

  // PayPal's captured amount is the truth. It can't differ from ours (the
  // order was built here), but if it ever did, record what actually moved.
  const [row] = await db
    .update(donations)
    .set({
      status,
      paypalCaptureId: capture.captureId,
      amountCents: capture.amountCents,
      currency: capture.currency,
      completedAt: status === "completed" ? new Date() : null,
    })
    .where(eq(donations.id, donationId))
    .returning({ amountCents: donations.amountCents });

  revalidatePath(`/nonprofits/${nonprofitId}`);
  if (status === "failed") return { error: "PayPal couldn't complete this payment. Please try another way to pay." };
  return { status, amountCents: row.amountCents };
}
