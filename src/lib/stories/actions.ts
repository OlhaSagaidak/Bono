"use server";

import { and, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { images, media, nonprofitProfiles, stories, storyViews } from "@/db/schema";

const uuid = z.uuid();

/** Records that the viewer saw a story (once per person). Owners don't count as viewers. */
export async function recordStoryViewAction(storyId: string): Promise<void> {
  const session = await auth();
  if (!session || !uuid.safeParse(storyId).success) return;
  const [story] = await db
    .select({ id: stories.id })
    .from(stories)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, stories.nonprofitId))
    .where(
      and(
        eq(stories.id, storyId),
        gt(stories.expiresAt, sql`now()`),
        isNotNull(nonprofitProfiles.verifiedAt),
        ne(stories.nonprofitId, session.user.id),
      ),
    );
  if (story) await db.insert(storyViews).values({ storyId, userId: session.user.id }).onConflictDoNothing();
}

/** The organization removes one of its own stories before it expires. */
export async function deleteStoryAction(storyId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "Log in first." };
  if (!uuid.safeParse(storyId).success) return { error: "That story wasn't found." };
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), eq(stories.nonprofitId, session.user.id)),
    columns: { imageId: true, mediaId: true },
  });
  if (!story) return { error: "That story wasn't found." };
  // Deleting the photo or video deletes the story with it.
  if (story.imageId) await db.delete(images).where(eq(images.id, story.imageId));
  if (story.mediaId) await db.delete(media).where(eq(media.id, story.mediaId));
  return {};
}
