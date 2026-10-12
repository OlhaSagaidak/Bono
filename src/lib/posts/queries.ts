import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { causes, nonprofitProfiles, postCauses, posts } from "@/db/schema";

export const PAGE_SIZE = 20;

export type FeedPost = Awaited<ReturnType<typeof getPosts>>["posts"][number];

/**
 * Newest posts first, PAGE_SIZE at a time. `before` is the id of the last post
 * on the previous page: paging by (created_at, id) of a real row stays correct
 * even when posts share a timestamp, and avoids round-tripping Postgres'
 * microsecond timestamps through JS Dates (which keep only milliseconds).
 * This is the week-1 chronological feed; the AI ranking replaces it in week 3.
 */
export async function getPosts({ nonprofitId, before }: { nonprofitId?: string; before?: string }) {
  const filters: SQL[] = [];
  if (nonprofitId) filters.push(eq(posts.nonprofitId, nonprofitId));
  if (before) {
    filters.push(
      sql`(${posts.createdAt}, ${posts.id}) < (SELECT created_at, id FROM ${posts} WHERE id = ${before})`,
    );
  }

  // One extra row tells us whether there is another page.
  const rows = await db
    .select({
      id: posts.id,
      body: posts.body,
      language: posts.language,
      imageId: posts.imageId,
      imageAlt: posts.imageAlt,
      createdAt: posts.createdAt,
      nonprofit: {
        id: nonprofitProfiles.userId,
        name: nonprofitProfiles.name,
        logoImageId: nonprofitProfiles.logoImageId,
      },
    })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  const tags = await getCauseTags(page.map((p) => p.id));
  return {
    posts: page.map((p) => ({ ...p, causes: tags.get(p.id) ?? [] })),
    nextBefore: rows.length > PAGE_SIZE ? page.at(-1)!.id : null,
    // Reference point for "5 minutes ago", taken here because render must stay pure.
    fetchedAt: Date.now(),
  };
}

async function getCauseTags(postIds: string[]) {
  const byPost = new Map<string, { slug: string; label: string }[]>();
  if (postIds.length === 0) return byPost;
  const rows = await db
    .select({ postId: postCauses.postId, slug: causes.slug, label: causes.label })
    .from(postCauses)
    .innerJoin(causes, eq(causes.slug, postCauses.causeSlug))
    .where(inArray(postCauses.postId, postIds))
    .orderBy(asc(causes.sortOrder));
  for (const { postId, ...cause } of rows) {
    byPost.set(postId, [...(byPost.get(postId) ?? []), cause]);
  }
  return byPost;
}
