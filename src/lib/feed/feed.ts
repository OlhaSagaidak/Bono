import "server-only";
import { and, cosineDistance, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { boosts, donations, follows, nonprofitProfiles, postLikes, posts, postViews, type Role } from "@/db/schema";
import { getPostsByIds, PAGE_SIZE } from "@/lib/posts/queries";
import { getUserVector } from "./learn";
import { rankPosts, type Candidate, type Factors } from "./rank";

// Candidates: recent posts from verified nonprofits. Ranking a few hundred in
// memory is fast and keeps the scoring readable (see rank.ts).
const CANDIDATE_DAYS = 60;
const MAX_CANDIDATES = 500;
// "Seen": on screen for at least a second within the last few days.
const SEEN_DAYS = 3;
const SEEN_MIN_MS = 1_000;

export async function getRankedFeed(viewer: { id: string; role: Role }, page: number) {
  const interests = await getUserVector(viewer.id, viewer.role);

  // pgvector's <=> is cosine distance (0 = same direction); similarity = 1 - distance.
  const similarity = interests
    ? sql<number | null>`1 - (${cosineDistance(posts.embedding, interests)})`
    : sql<null>`null`;
  const rows = await db
    .select({
      id: posts.id,
      createdAt: posts.createdAt,
      similarity,
      likes: sql<number>`(select count(*) from ${postLikes} where ${postLikes.postId} = ${posts.id})::int`,
      donations: sql<number>`(select count(*) from ${donations} where ${donations.postId} = ${posts.id} and ${donations.status} = 'completed')::int`,
      boosted: sql<boolean>`exists (select 1 from ${boosts} where ${boosts.postId} = ${posts.id}
        and ${boosts.startsAt} <= now() and ${boosts.endsAt} > now())`,
      followed: sql<boolean>`exists (select 1 from ${follows} where ${follows.followerId} = ${viewer.id} and ${follows.nonprofitId} = ${posts.nonprofitId})`,
      seen: sql<boolean>`exists (select 1 from ${postViews} where ${postViews.userId} = ${viewer.id} and ${postViews.postId} = ${posts.id}
        and ${postViews.dwellMs} >= ${SEEN_MIN_MS} and ${postViews.lastSeenAt} > now() - make_interval(days => ${SEEN_DAYS}))`,
    })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(
      and(
        isNotNull(nonprofitProfiles.verifiedAt), // only verified nonprofits, ever
        gt(posts.createdAt, sql`now() - make_interval(days => ${CANDIDATE_DAYS})`),
      ),
    )
    .orderBy(desc(posts.createdAt))
    .limit(MAX_CANDIDATES);

  const candidates: Candidate[] = rows.map((r) => ({
    ...r,
    similarity: r.similarity === null ? null : Number(r.similarity),
  }));
  const ranked = rankPosts(candidates, viewer.id);

  const start = (page - 1) * PAGE_SIZE;
  const pageOfRanked = ranked.slice(start, start + PAGE_SIZE);
  return {
    posts: await getPostsByIds(pageOfRanked.map((r) => r.id), viewer.id),
    // Kept for "Why am I seeing this?" (a later slice).
    factors: new Map<string, Factors>(pageOfRanked.map((r) => [r.id, r.factors])),
    // Where "You're all caught up" goes on this page: before the first seen post, if any.
    caughtUpAt: (() => {
      const i = pageOfRanked.findIndex((r) => r.seen);
      return i >= 0 && !(start > 0 && i === 0 && ranked[start - 1]?.seen) ? i : null;
    })(),
    nextPage: ranked.length > start + PAGE_SIZE ? page + 1 : null,
    fetchedAt: Date.now(),
  };
}
