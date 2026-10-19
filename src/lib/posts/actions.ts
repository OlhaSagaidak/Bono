"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { images, nonprofitCauses, nonprofitProfiles, postCauses, posts } from "@/db/schema";
import { formText, type FormState } from "@/lib/forms";
import { embedPosts } from "@/lib/ai/embed-posts";
import { checkUploadedImage, fitImage, storeImage } from "@/lib/images";
import { postSchema } from "./validation";

export async function createPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // Server Actions are public endpoints, so re-check the caller every time.
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "nonprofit") return { error: "Only nonprofits can post." };
  const nonprofitId = session.user.id;

  const profile = await db.query.nonprofitProfiles.findFirst({
    where: eq(nonprofitProfiles.userId, nonprofitId),
    columns: { verifiedAt: true },
  });
  if (!profile) redirect("/onboarding");
  if (!profile.verifiedAt) return { error: "Your nonprofit needs to be verified before it can post." };

  // Posts may only use the nonprofit's own causes.
  const allowed = await db
    .select({ slug: nonprofitCauses.causeSlug })
    .from(nonprofitCauses)
    .where(eq(nonprofitCauses.nonprofitId, nonprofitId));

  const values = {
    body: formText(formData, "body"),
    language: formText(formData, "language"),
    causes: formData.getAll("causes").map(String),
    imageAlt: formText(formData, "imageAlt"),
  };
  const parsed = postSchema.safeParse(values);
  const image = await checkUploadedImage(formData.get("image"));
  const fieldErrors: Record<string, string[] | undefined> = parsed.success
    ? {}
    : z.flattenError(parsed.error).fieldErrors;
  if (image.kind === "error") fieldErrors.image = [image.message];
  // Alt text is what screen-reader users get instead of the picture.
  if (image.kind === "ok" && !values.imageAlt.trim()) {
    fieldErrors.imageAlt = ["Describe the image for people who can't see it."];
  }
  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const allowedSlugs = new Set(allowed.map((a) => a.slug));
  if (parsed.data.causes.some((c) => !allowedSlugs.has(c))) {
    return { error: "Tag the post with your organization's own causes.", values };
  }

  const { body, language, causes, imageAlt } = parsed.data;
  // Re-encoded and capped at 1600 px wide, which also strips metadata.
  const stored = image.kind === "ok" ? await fitImage(image).catch(() => null) : null;
  if (image.kind === "ok" && !stored) return { fieldErrors: { image: ["That image couldn't be read. Try another one."] }, values };
  const postId = await db.transaction(async (tx) => {
    const imageId = stored ? await storeImage(tx, nonprofitId, stored) : null;
    const [post] = await tx
      .insert(posts)
      .values({ nonprofitId, body, language, imageId, imageAlt: imageId ? imageAlt : null })
      .returning({ id: posts.id });
    await tx.insert(postCauses).values(causes.map((causeSlug) => ({ postId: post.id, causeSlug })));
    return post.id;
  });

  // Embed it for the AI feed. A failure here mustn't lose the post: it still
  // shows (ranked by freshness alone) and `npm run embed` fills the gap.
  try {
    await embedPosts({ postIds: [postId] });
  } catch (error) {
    console.error(`Embedding post ${postId} failed:`, error);
  }

  // Drop any copy of these pages the browser kept from an earlier visit.
  revalidatePath("/feed");
  revalidatePath(`/nonprofits/${nonprofitId}`);
  redirect("/feed");
}

export async function deletePostAction(postId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) redirect("/login");
  if (!z.uuid().safeParse(postId).success) return { error: "That post doesn't exist." };

  // Matching on the owner in the WHERE clause means a nonprofit can only ever
  // delete its own posts, whatever id is sent.
  const deleted = await db.transaction(async (tx) => {
    const [post] = await tx
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.nonprofitId, session.user.id)))
      .returning({ imageId: posts.imageId });
    if (post?.imageId) await tx.delete(images).where(eq(images.id, post.imageId));
    return Boolean(post);
  });
  if (!deleted) return { error: "That post was already deleted, or isn't yours." };

  revalidatePath("/feed");
  revalidatePath(`/nonprofits/${session.user.id}`);
  return {};
}
