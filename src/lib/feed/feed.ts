import "server-only";
import { and, cosineDistance, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { nonprofitProfiles, posts, type Role } from "@/db/schema";
import { getPostsByIds, PAGE_SIZE } from "@/lib/posts/queries";
import { coldStartVector } from "./interests";
import { rankPosts, type Candidate, type Factors } from "./rank";

// Candidates: recent posts from verified nonprofits. Ranking a few hundred in
// memory is fast and keeps the scoring readable (see rank.ts).
const CANDIDATE_DAYS = 60;
const MAX_CANDIDATES = 500;

export async function getRankedFeed(viewer: { id: string; role: Role }, page: number) {
  const interests = await coldStartVector(viewer.id, viewer.role);

  // pgvector's <=> is cosine distance (0 = same direction); similarity = 1 - distance.
  const similarity = interests
    ? sql<number | null>`1 - (${cosineDistance(posts.embedding, interests)})`
    : sql<null>`null`;
  const rows = await db
    .select({ id: posts.id, createdAt: posts.createdAt, similarity })
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
    id: r.id,
    createdAt: r.createdAt,
    similarity: r.similarity === null ? null : Number(r.similarity),
  }));
  const ranked = rankPosts(candidates, viewer.id);

  const start = (page - 1) * PAGE_SIZE;
  const pageOfRanked = ranked.slice(start, start + PAGE_SIZE);
  return {
    posts: await getPostsByIds(pageOfRanked.map((r) => r.id)),
    // Kept for "Why am I seeing this?" (a later slice).
    factors: new Map<string, Factors>(pageOfRanked.map((r) => [r.id, r.factors])),
    nextPage: ranked.length > start + PAGE_SIZE ? page + 1 : null,
    fetchedAt: Date.now(),
  };
}
