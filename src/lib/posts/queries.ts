import { and, asc, count, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { causes, follows, nonprofitProfiles, postCauses, postLikes, posts } from "@/db/schema";

export const PAGE_SIZE = 20;

export type FeedPost = Awaited<ReturnType<typeof getPostsByIds>>[number];

// What a post card needs, joined with its nonprofit.
const postColumns = {
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
};

/**
 * These posts, in the order given (e.g. the ranked feed's order), with their
 * cause tags, like counts and, for a signed-in viewer, whether they liked
 * each post and follow its nonprofit.
 */
export async function getPostsByIds(ids: string[], viewerId: string | null = null) {
  if (ids.length === 0) return [];
  const rows = await db
    .select(postColumns)
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(inArray(posts.id, ids));
  const [tags, engagement] = await Promise.all([
    getCauseTags(ids),
    getEngagement(ids, [...new Set(rows.map((r) => r.nonprofit.id))], viewerId),
  ]);
  const byId = new Map(
    rows.map((r) => [
      r.id,
      {
        ...r,
        causes: tags.get(r.id) ?? [],
        likes: engagement.likes.get(r.id) ?? 0,
        likedByViewer: engagement.liked.has(r.id),
        viewerFollows: engagement.followed.has(r.nonprofit.id),
      },
    ]),
  );
  return ids.flatMap((id) => byId.get(id) ?? []);
}

async function getEngagement(postIds: string[], nonprofitIds: string[], viewerId: string | null) {
  const [likeCounts, liked, followed] = await Promise.all([
    db
      .select({ postId: postLikes.postId, n: count() })
      .from(postLikes)
      .where(inArray(postLikes.postId, postIds))
      .groupBy(postLikes.postId),
    viewerId
      ? db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(and(eq(postLikes.userId, viewerId), inArray(postLikes.postId, postIds)))
      : [],
    viewerId && nonprofitIds.length
      ? db
          .select({ nonprofitId: follows.nonprofitId })
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), inArray(follows.nonprofitId, nonprofitIds)))
      : [],
  ]);
  return {
    likes: new Map(likeCounts.map((r) => [r.postId, r.n])),
    liked: new Set(liked.map((r) => r.postId)),
    followed: new Set(followed.map((r) => r.nonprofitId)),
  };
}

/**
 * Newest posts first, PAGE_SIZE at a time (nonprofit pages; the feed itself
 * is ranked, see lib/feed). `before` is the id of the last post
 * on the previous page: paging by (created_at, id) of a real row stays correct
 * even when posts share a timestamp, and avoids round-tripping Postgres'
 * microsecond timestamps through JS Dates (which keep only milliseconds).
 * Without a nonprofitId, only verified nonprofits' posts are included.
 */
export async function getPosts({
  nonprofitId,
  before,
  viewerId = null,
}: {
  nonprofitId?: string;
  before?: string;
  viewerId?: string | null;
}) {
  const filters: SQL[] = [];
  // The shared feed only ever shows verified nonprofits. A single nonprofit's
  // page decides for itself who may see it (see app/nonprofits/[id]).
  if (nonprofitId) filters.push(eq(posts.nonprofitId, nonprofitId));
  else filters.push(isNotNull(nonprofitProfiles.verifiedAt));
  if (before) {
    filters.push(
      sql`(${posts.createdAt}, ${posts.id}) < (SELECT created_at, id FROM ${posts} WHERE id = ${before})`,
    );
  }

  // One extra row tells us whether there is another page.
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  return {
    posts: await getPostsByIds(page.map((p) => p.id), viewerId),
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
