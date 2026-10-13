"use server";

import { and, count, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { follows, nonprofitProfiles, postLikes, posts } from "@/db/schema";

// Likes and follows: small signals the AI feed learns from. Both toggle, and
// both only work on verified nonprofits (others are invisible anyway).

type Result<T> = T | { error: string };
const uuid = z.uuid();

export async function toggleLikeAction(postId: string): Promise<Result<{ liked: boolean; likes: number }>> {
  const session = await auth();
  if (!session) return { error: "Log in to like posts." };
  if (!uuid.safeParse(postId).success) return { error: "That post doesn't exist." };
  const userId = session.user.id;

  const [post] = await db
    .select({ nonprofitId: posts.nonprofitId })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(and(eq(posts.id, postId), isNotNull(nonprofitProfiles.verifiedAt)));
  if (!post) return { error: "That post doesn't exist." };
  if (post.nonprofitId === userId) return { error: "You can't like your own posts." };

  // Delete-or-insert decides the new state, so a double click can't desync it.
  const removed = await db
    .delete(postLikes)
    .where(and(eq(postLikes.userId, userId), eq(postLikes.postId, postId)))
    .returning({ postId: postLikes.postId });
  if (removed.length === 0) await db.insert(postLikes).values({ userId, postId }).onConflictDoNothing();

  const [{ likes }] = await db.select({ likes: count() }).from(postLikes).where(eq(postLikes.postId, postId));
  return { liked: removed.length === 0, likes };
}

export async function toggleFollowAction(nonprofitId: string): Promise<Result<{ following: boolean }>> {
  const session = await auth();
  if (!session) return { error: "Log in to follow nonprofits." };
  if (!uuid.safeParse(nonprofitId).success) return { error: "That nonprofit doesn't exist." };
  const followerId = session.user.id;
  if (nonprofitId === followerId) return { error: "You can't follow your own organization." };

  const nonprofit = await db.query.nonprofitProfiles.findFirst({
    where: and(eq(nonprofitProfiles.userId, nonprofitId), isNotNull(nonprofitProfiles.verifiedAt)),
    columns: { userId: true },
  });
  if (!nonprofit) return { error: "That nonprofit doesn't exist." };

  const removed = await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.nonprofitId, nonprofitId)))
    .returning({ nonprofitId: follows.nonprofitId });
  if (removed.length === 0) await db.insert(follows).values({ followerId, nonprofitId }).onConflictDoNothing();
  return { following: removed.length === 0 };
}
