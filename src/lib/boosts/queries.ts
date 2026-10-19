import "server-only";
import { and, desc, eq, gt, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { boosts, donations, nonprofitProfiles, postLikes, posts, postViews, sponsorProfiles } from "@/db/schema";

const isActive = () => and(isNotNull(boosts.startsAt), lte(boosts.startsAt, sql`now()`), gt(boosts.endsAt, sql`now()`));

/** Sponsors currently boosting each of these posts (for the "Boosted by" label). */
export async function activeBoostSponsors(postIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (postIds.length === 0) return result;
  const rows = await db
    .selectDistinct({ postId: boosts.postId, sponsorName: sponsorProfiles.name })
    .from(boosts)
    .innerJoin(sponsorProfiles, eq(sponsorProfiles.userId, boosts.sponsorId))
    .where(and(inArray(boosts.postId, postIds), isActive()));
  for (const r of rows) result.set(r.postId, [...(result.get(r.postId) ?? []), r.sponsorName]);
  return result;
}

/** A sponsor's paid boosts, newest first, with what happened on the post since the boost started. */
export async function getSponsorBoosts(sponsorId: string) {
  return db
    .select({
      id: boosts.id,
      postId: boosts.postId,
      postBody: posts.body,
      nonprofitName: nonprofitProfiles.name,
      amountCents: boosts.amountCents,
      startsAt: boosts.startsAt,
      endsAt: boosts.endsAt,
      views: sql<number>`(select count(*) from ${postViews} v where v.post_id = ${boosts.postId} and v.last_seen_at >= ${boosts.startsAt})::int`,
      likes: sql<number>`(select count(*) from ${postLikes} l where l.post_id = ${boosts.postId} and l.created_at >= ${boosts.startsAt})::int`,
      donationsCents: sql<number>`(select coalesce(sum(d.amount_cents), 0) from ${donations} d where d.post_id = ${boosts.postId}
        and d.status = 'completed' and d.completed_at >= ${boosts.startsAt})::int`,
    })
    .from(boosts)
    .innerJoin(posts, eq(posts.id, boosts.postId))
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(and(eq(boosts.sponsorId, sponsorId), isNotNull(boosts.startsAt)))
    .orderBy(desc(boosts.startsAt));
}
