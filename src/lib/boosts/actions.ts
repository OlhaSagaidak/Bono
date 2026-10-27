"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { boosts, nonprofitProfiles, posts } from "@/db/schema";
import { captureOrder, createOrder, getOrderCapture, paymentStatusFrom, type CaptureDetails } from "@/lib/paypal/orders";
import { paypalReturnUrls } from "@/lib/paypal/return-urls";
import { platformPayeeEmail } from "@/lib/verification/config";
import { boostTerms } from "./config";

// A sponsor boosts a nonprofit's post: a fixed fee, paid to the platform
// through PayPal (Orders v2, same helpers as donations), for a fixed number of
// days. The fee and length come from the server, never the browser.

const TRY_AGAIN = "Something went wrong on our side. You weren't charged. Please try again.";

async function sponsorId(): Promise<string | null> {
  const session = await auth();
  return session?.user.role === "sponsor" ? session.user.id : null;
}

/** `redirect`: phones go to PayPal in the same tab and come back to /paypal/return. */
export async function createBoostOrderAction(
  postId: string,
  options: { redirect?: boolean } = {},
): Promise<{ orderId: string; approveUrl?: string } | { error: string }> {
  const sponsor = await sponsorId();
  if (!sponsor) return { error: "Only sponsors can boost posts." };
  if (!z.uuid().safeParse(postId).success) return { error: "That post doesn't exist." };

  const [post] = await db
    .select({ id: posts.id, nonprofitName: nonprofitProfiles.name })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(and(eq(posts.id, postId), isNotNull(nonprofitProfiles.verifiedAt)));
  if (!post) return { error: "That post doesn't exist." };

  const { feeCents, days } = boostTerms();
  const [boost] = await db.insert(boosts).values({ sponsorId: sponsor, postId, amountCents: feeCents, days }).returning({ id: boosts.id });
  const outcome = await createOrder({
    requestId: `boost-create-${boost.id}`,
    amountCents: feeCents,
    payeeEmail: platformPayeeEmail(),
    description: `Bono boost: a post by ${post.nonprofitName}, ${days} days`,
    customId: boost.id,
    ...(options.redirect ? { returnTo: await paypalReturnUrls("boost", `/posts/${post.id}`) } : {}),
  });
  if (outcome.kind !== "created") {
    await db.delete(boosts).where(eq(boosts.id, boost.id));
    return { error: TRY_AGAIN };
  }
  await db.update(boosts).set({ paypalOrderId: outcome.orderId }).where(eq(boosts.id, boost.id));
  return { orderId: outcome.orderId, ...(outcome.approveUrl ? { approveUrl: outcome.approveUrl } : {}) };
}

export async function captureBoostAction(orderId: string): Promise<{ endsAt: string } | { declined: true } | { error: string }> {
  const sponsor = await sponsorId();
  if (!sponsor) return { error: "Only sponsors can boost posts." };
  if (typeof orderId !== "string" || !/^[A-Z0-9]{1,64}$/.test(orderId)) return { error: "That payment wasn't found." };
  const boost = await db.query.boosts.findFirst({ where: and(eq(boosts.paypalOrderId, orderId), eq(boosts.sponsorId, sponsor)) });
  if (!boost) return { error: "That payment wasn't found." };
  if (boost.endsAt) return { endsAt: boost.endsAt.toISOString() };

  const outcome = await captureOrder(orderId, `boost-capture-${boost.id}`);
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

  // The boost runs from now for its number of days.
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + boost.days * 86_400_000);
  await db
    .update(boosts)
    .set({ paypalCaptureId: capture.captureId, amountCents: capture.amountCents, startsAt, endsAt })
    .where(eq(boosts.id, boost.id));
  revalidatePath("/feed");
  revalidatePath("/campaigns");
  return { endsAt: endsAt.toISOString() };
}
