"use server";

import { and, count, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { media, nonprofitProfiles, reelLikes, reelSaves, reels } from "@/db/schema";

// Likes, saves and deletes for reels. Like posts, only reels from verified
// nonprofits can be liked or saved, and organizations can't like their own.

type Result<T> = T | { error: string };
const uuid = z.uuid();

async function visibleReel(reelId: string) {
  if (!uuid.safeParse(reelId).success) return null;
  const [reel] = await db
    .select({ nonprofitId: reels.nonprofitId })
    .from(reels)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, reels.nonprofitId))
    .where(and(eq(reels.id, reelId), isNotNull(nonprofitProfiles.verifiedAt)));
  return reel ?? null;
}

export async function toggleReelLikeAction(reelId: string): Promise<Result<{ liked: boolean; likes: number }>> {
  const session = await auth();
  if (!session) return { error: "Log in to like reels." };
  const reel = await visibleReel(reelId);
  if (!reel) return { error: "That reel doesn't exist." };
  const userId = session.user.id;
  if (reel.nonprofitId === userId) return { error: "You can't like your own reels." };

  const removed = await db
    .delete(reelLikes)
    .where(and(eq(reelLikes.userId, userId), eq(reelLikes.reelId, reelId)))
    .returning({ reelId: reelLikes.reelId });
  if (removed.length === 0) await db.insert(reelLikes).values({ userId, reelId }).onConflictDoNothing();
  const [{ likes }] = await db.select({ likes: count() }).from(reelLikes).where(eq(reelLikes.reelId, reelId));
  return { liked: removed.length === 0, likes };
}

export async function toggleReelSaveAction(reelId: string): Promise<Result<{ saved: boolean }>> {
  const session = await auth();
  if (!session) return { error: "Log in to save reels." };
  if (!(await visibleReel(reelId))) return { error: "That reel doesn't exist." };
  const userId = session.user.id;
  const removed = await db
    .delete(reelSaves)
    .where(and(eq(reelSaves.userId, userId), eq(reelSaves.reelId, reelId)))
    .returning({ reelId: reelSaves.reelId });
  if (removed.length === 0) await db.insert(reelSaves).values({ userId, reelId }).onConflictDoNothing();
  return { saved: removed.length === 0 };
}

/** Only the organization that posted a reel can delete it. */
export async function deleteReelAction(reelId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "Log in first." };
  if (!uuid.safeParse(reelId).success) return { error: "That reel doesn't exist." };
  const reel = await db.query.reels.findFirst({
    where: and(eq(reels.id, reelId), eq(reels.nonprofitId, session.user.id)),
    columns: { mediaId: true },
  });
  if (!reel) return { error: "That reel was already deleted, or isn't yours." };
  // Deleting the video deletes the reel (and its likes and saves) with it.
  await db.delete(media).where(eq(media.id, reel.mediaId));
  revalidatePath("/reels");
  revalidatePath(`/nonprofits/${session.user.id}`);
  return {};
}
