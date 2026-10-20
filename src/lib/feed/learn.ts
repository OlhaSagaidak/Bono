import "server-only";
import { and, eq, gte, isNotNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { donations, follows, postComments, postLikes, posts, postViews, userVectors, type Role } from "@/db/schema";
import { coldStartVector, normalize } from "./interests";

// How the feed learns what someone cares about.
//
// Their interest vector is a weighted average, recomputed from scratch:
//
//   vector = normalize( 1.0 × cold start                      (the causes they picked)
//                     + Σ weight × recency × post vector )     (what they engaged with)
//
// Stronger actions weigh more: donate > follow > comment > like > a long look.
// Writing a comment shows more interest than a like; several comments on one
// post still count once.
// recency halves every 30 days, so tastes can drift. A follow, or a donation
// made from a profile rather than a post, counts the nonprofit's average post.
// Recomputing from scratch (instead of nudging the vector on every click)
// keeps it easy to explain and check: the same history gives the same vector.

export const SIGNAL_WEIGHTS = { donation: 1.0, follow: 0.6, comment: 0.5, like: 0.4, longLook: 0.2 } as const;
export const COLD_START_WEIGHT = 1.0;
export const LONG_LOOK_MS = 8_000;
const RECENCY_HALF_LIFE_DAYS = 30;

type Signal = { weight: number; at: Date; vector: number[] };

const parseVector = (text: string | null): number[] | null => (text ? (JSON.parse(text) as number[]) : null);

function recency(at: Date, now: number): number {
  const ageDays = Math.max(0, (now - at.getTime()) / 86_400_000);
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

async function engagementSignals(userId: string): Promise<Signal[]> {
  // A nonprofit's "average post": pgvector can average vectors in SQL.
  const nonprofitCentroid = (nonprofitId: unknown) =>
    sql<string | null>`(select avg(${posts.embedding})::text from ${posts} where ${posts.nonprofitId} = ${nonprofitId})`;

  const [likes, comments, looks, follows_, gifts] = await Promise.all([
    db
      .select({ at: postLikes.createdAt, vector: posts.embedding })
      .from(postLikes)
      .innerJoin(posts, eq(posts.id, postLikes.postId))
      .where(and(eq(postLikes.userId, userId), isNotNull(posts.embedding))),
    db
      .select({ at: max(postComments.createdAt), vector: posts.embedding })
      .from(postComments)
      .innerJoin(posts, eq(posts.id, postComments.postId))
      .where(and(eq(postComments.authorId, userId), isNotNull(posts.embedding)))
      .groupBy(posts.id),
    db
      .select({ at: postViews.lastSeenAt, vector: posts.embedding })
      .from(postViews)
      .innerJoin(posts, eq(posts.id, postViews.postId))
      .where(and(eq(postViews.userId, userId), gte(postViews.dwellMs, LONG_LOOK_MS), isNotNull(posts.embedding))),
    db
      .select({ at: follows.createdAt, vector: nonprofitCentroid(follows.nonprofitId) })
      .from(follows)
      .where(eq(follows.followerId, userId)),
    db
      .select({
        at: donations.completedAt,
        vector: sql<string | null>`coalesce(
          (select ${posts.embedding}::text from ${posts} where ${posts.id} = ${donations.postId}),
          ${nonprofitCentroid(donations.nonprofitId)})`,
      })
      .from(donations)
      .where(and(eq(donations.donorId, userId), eq(donations.status, "completed"))),
  ]);

  const signals: Signal[] = [];
  for (const r of likes) signals.push({ weight: SIGNAL_WEIGHTS.like, at: r.at, vector: r.vector! });
  for (const r of comments) signals.push({ weight: SIGNAL_WEIGHTS.comment, at: r.at!, vector: r.vector! });
  for (const r of looks) signals.push({ weight: SIGNAL_WEIGHTS.longLook, at: r.at, vector: r.vector! });
  for (const r of follows_) {
    const v = parseVector(r.vector);
    if (v) signals.push({ weight: SIGNAL_WEIGHTS.follow, at: r.at, vector: v });
  }
  for (const r of gifts) {
    const v = parseVector(r.vector);
    if (v && r.at) signals.push({ weight: SIGNAL_WEIGHTS.donation, at: r.at, vector: v });
  }
  return signals;
}

/** Computes someone's interest vector from scratch (see the formula above). */
export async function computeUserVector(
  userId: string,
  role: Role,
  now = Date.now(),
): Promise<{ vector: number[]; signalCount: number } | null> {
  const [cold, signals] = await Promise.all([coldStartVector(userId, role), engagementSignals(userId)]);
  const dims = cold?.length ?? signals[0]?.vector.length;
  if (!dims) return null; // no causes and no engagement yet: no vector, a fresh-first feed

  const sum = new Array<number>(dims).fill(0);
  if (cold) for (let i = 0; i < dims; i++) sum[i] += COLD_START_WEIGHT * cold[i];
  for (const s of signals) {
    const w = s.weight * recency(s.at, now);
    for (let i = 0; i < dims; i++) sum[i] += w * s.vector[i];
  }
  return { vector: normalize(sum), signalCount: signals.length };
}

/**
 * The stored vector, recomputed first if anything happened since it was
 * computed (a like, comment, follow, donation or long look). This stands in for a
 * background job: the work is a few vector additions, done when the feed loads.
 */
export async function getUserVector(userId: string, role: Role): Promise<number[] | null> {
  const stored = await db.query.userVectors.findFirst({ where: eq(userVectors.userId, userId) });

  if (stored) {
    const [{ latest }] = await db.execute<{ latest: Date | null }>(sql`
      select greatest(
        (select max(created_at) from ${postLikes} where user_id = ${userId}),
        (select max(created_at) from ${postComments} where author_id = ${userId}),
        (select max(created_at) from ${follows} where follower_id = ${userId}),
        (select max(completed_at) from ${donations} where donor_id = ${userId} and status = 'completed'),
        (select max(last_seen_at) from ${postViews} where user_id = ${userId} and dwell_ms >= ${LONG_LOOK_MS})
      ) as latest`).then((r) => r.rows);
    if (!latest || new Date(latest) <= stored.computedAt) return stored.embedding;
  }

  const computed = await computeUserVector(userId, role);
  if (!computed) return null;
  const values = { embedding: computed.vector, signalCount: computed.signalCount, computedAt: new Date() };
  await db
    .insert(userVectors)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userVectors.userId, set: values });
  return computed.vector;
}

/** Forget the stored vector, e.g. after someone changes their causes. */
export async function resetUserVector(userId: string): Promise<void> {
  await db.delete(userVectors).where(eq(userVectors.userId, userId));
}
