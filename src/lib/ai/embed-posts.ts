import "server-only";
import { and, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { causes, postCauses, posts } from "@/db/schema";
import { causeEmbeddingText } from "@/lib/feed/causes";
import { embedTexts, postEmbeddingText } from "./embeddings";

/**
 * Embeds posts that don't have a vector yet (or exactly `postIds`, when
 * given, e.g. to redo them). Returns how many were embedded.
 */
export async function embedPosts(options: { postIds?: string[]; onlyMissing?: boolean } = {}): Promise<number> {
  const filters: SQL[] = [];
  if (options.postIds) filters.push(inArray(posts.id, options.postIds));
  if (options.onlyMissing ?? true) filters.push(isNull(posts.embedding));

  const rows = await db.select({ id: posts.id, body: posts.body }).from(posts).where(and(...filters));
  if (rows.length === 0) return 0;

  const tags = await db
    .select({ postId: postCauses.postId, label: causes.label })
    .from(postCauses)
    .innerJoin(causes, eq(causes.slug, postCauses.causeSlug))
    .where(inArray(postCauses.postId, rows.map((r) => r.id)));
  const labelsByPost = new Map<string, string[]>();
  for (const t of tags) labelsByPost.set(t.postId, [...(labelsByPost.get(t.postId) ?? []), t.label]);

  // Small batches keep memory flat on the 512 MB server.
  for (let i = 0; i < rows.length; i += 16) {
    const batch = rows.slice(i, i + 16);
    const vectors = await embedTexts(batch.map((r) => postEmbeddingText(r.body, labelsByPost.get(r.id) ?? [])));
    await Promise.all(batch.map((r, j) => db.update(posts).set({ embedding: vectors[j] }).where(eq(posts.id, r.id))));
  }
  return rows.length;
}

/** (Re)embeds every cause from its description. Cheap: there are seven. */
export async function embedCauses(): Promise<number> {
  const rows = await db.select({ slug: causes.slug, label: causes.label }).from(causes);
  const vectors = await embedTexts(rows.map((r) => causeEmbeddingText(r.slug, r.label)));
  await Promise.all(rows.map((r, i) => db.update(causes).set({ embedding: vectors[i] }).where(eq(causes.slug, r.slug))));
  return rows.length;
}
