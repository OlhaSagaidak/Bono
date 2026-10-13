"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { nonprofitProfiles, posts } from "@/db/schema";
import { LANGUAGES } from "@/lib/posts/validation";
import { explainWhy } from "@/lib/feed/why";
import { AiUnavailableError, translate } from "./claude";

const translateInput = z.object({
  postId: z.uuid(),
  language: z.enum(LANGUAGES.map((l) => l.value) as [string, ...string[]]),
});

/** A post in the viewer's language. Signed-in only: every new translation costs a (tiny) Claude call. */
export async function translatePostAction(postId: string, language: string): Promise<{ text: string } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Log in to translate posts." };
  const parsed = translateInput.safeParse({ postId, language });
  if (!parsed.success) return { error: "That translation isn't available." };

  const [post] = await db
    .select({ body: posts.body, language: posts.language })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(and(eq(posts.id, parsed.data.postId), isNotNull(nonprofitProfiles.verifiedAt)));
  if (!post) return { error: "That post doesn't exist." };
  if (post.language === parsed.data.language) return { text: post.body };

  try {
    return { text: await translate(post.body, parsed.data.language) };
  } catch (error) {
    if (error instanceof AiUnavailableError) return { error: "Translation isn't available right now. Please try again later." };
    throw error;
  }
}

/** "Why am I seeing this?" for one post in the viewer's feed (generated lazily, cached). */
export async function whyAction(postId: string): Promise<{ text: string } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Log in to see why." };
  if (!z.uuid().safeParse(postId).success) return { error: "That post doesn't exist." };
  const text = await explainWhy(session.user.id, postId);
  return text ? { text } : { error: "That post doesn't exist." };
}
