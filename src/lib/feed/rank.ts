import { createHash } from "node:crypto";

// How Bono orders the feed. Every candidate post gets a score; the feed shows
// the highest scores first. The score is a weighted sum of a few factors,
// each between 0 and 1, so the weights say how much each one matters:
//
//   score = 1.00 × relevance     how close the post is to what this person cares about
//         + 0.35 × freshness     1 for a brand-new post, halving every 3 days
//         + 0.20 × followed      1 if they follow the nonprofit
//         + 0.15 × popularity    likes and donations from everyone, with diminishing returns
//         + 0.08 × exploration   a small random nudge, so other causes still surface
//
// relevance is the cosine similarity between the person's interest vector
// (lib/feed/learn.ts, which learns from their likes, follows, donations and
// long looks) and the post's embedding (lib/ai/embeddings.ts). Related texts
// score about 0.3–0.6 with this model, unrelated ones near 0.
//
// Posts they've already seen in the last few days go after all unseen ones
// ("You're all caught up"), still in score order, instead of disappearing.
//
// Sponsor boosts join this sum in week 4.

export const WEIGHTS = { relevance: 1.0, freshness: 0.35, followed: 0.2, popularity: 0.15, exploration: 0.08 } as const;
export const FRESHNESS_HALF_LIFE_HOURS = 72;
// Likes plus donations (a donation counts 3×) at which popularity reaches 1.
const POPULARITY_FULL_AT = 30;

export type Candidate = {
  id: string;
  createdAt: Date;
  /** Cosine similarity to the viewer's interests, or null when either side has no vector. */
  similarity: number | null;
  likes: number;
  donations: number;
  followed: boolean;
  /** Seen by this viewer recently. */
  seen: boolean;
};

export type Factors = { relevance: number; freshness: number; followed: number; popularity: number; exploration: number };
export type Ranked = Candidate & { score: number; factors: Factors };

/** 1 now, 0.5 after one half-life, 0.25 after two, and so on. */
export function freshness(createdAt: Date, now: number): number {
  const ageHours = Math.max(0, (now - createdAt.getTime()) / 3_600_000);
  return Math.pow(0.5, ageHours / FRESHNESS_HALF_LIFE_HOURS);
}

/** 0 with no engagement, rising quickly at first and then slowly, capped at 1. */
export function popularity(likes: number, donations: number): number {
  return Math.min(1, Math.log1p(likes + 3 * donations) / Math.log1p(POPULARITY_FULL_AT));
}

/**
 * A number in [0, 1) that looks random but is fixed for the same viewer, post
 * and day, so the order doesn't reshuffle on every reload or between pages.
 */
export function exploration(viewerId: string, postId: string, day: string): number {
  const hash = createHash("sha256").update(`${viewerId}:${postId}:${day}`).digest();
  return hash.readUInt32BE(0) / 2 ** 32;
}

export function rankPosts(candidates: Candidate[], viewerId: string, now = Date.now()): Ranked[] {
  const day = new Date(now).toISOString().slice(0, 10);
  return candidates
    .map((c) => {
      const factors: Factors = {
        relevance: Math.max(0, c.similarity ?? 0),
        freshness: freshness(c.createdAt, now),
        followed: c.followed ? 1 : 0,
        popularity: popularity(c.likes, c.donations),
        exploration: exploration(viewerId, c.id, day),
      };
      const score = (Object.keys(WEIGHTS) as (keyof Factors)[]).reduce((sum, k) => sum + WEIGHTS[k] * factors[k], 0);
      return { ...c, score, factors };
    })
    .sort(
      (a, b) =>
        Number(a.seen) - Number(b.seen) || // unseen first
        b.score - a.score ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
}
