import "server-only";
import { and, asc, count, desc, eq, ilike, isNotNull, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, nonprofitCauses, nonprofitProfiles } from "@/db/schema";

export async function isFollowing(followerId: string, nonprofitId: string): Promise<boolean> {
  const row = await db.query.follows.findFirst({
    where: and(eq(follows.followerId, followerId), eq(follows.nonprofitId, nonprofitId)),
    columns: { nonprofitId: true },
  });
  return Boolean(row);
}

const orgColumns = {
  id: nonprofitProfiles.userId,
  name: nonprofitProfiles.name,
  logoImageId: nonprofitProfiles.logoImageId,
  mission: nonprofitProfiles.mission,
};

/** Verified organizations this person follows, alphabetically; optionally filtered by name. */
export async function getFollowedOrgs(userId: string, options: { search?: string; limit?: number } = {}) {
  const query = db
    .select(orgColumns)
    .from(follows)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, follows.nonprofitId))
    .where(
      and(
        eq(follows.followerId, userId),
        isNotNull(nonprofitProfiles.verifiedAt),
        options.search ? ilike(nonprofitProfiles.name, `%${options.search.replace(/[%_\\]/g, "\\$&")}%`) : undefined,
      ),
    )
    .orderBy(asc(nonprofitProfiles.name));
  return options.limit ? query.limit(options.limit) : query;
}

export async function countFollowedOrgs(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(follows)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, follows.nonprofitId))
    .where(and(eq(follows.followerId, userId), isNotNull(nonprofitProfiles.verifiedAt)));
  return row.n;
}

/** Verified organizations this person doesn't follow yet, most followed first, optionally in one cause. */
export function discoverOrgs(userId: string, causeSlug?: string) {
  return db
    .select({
      ...orgColumns,
      followers: sql<number>`(select count(*) from ${follows} f where f.nonprofit_id = ${nonprofitProfiles.userId})::int`,
    })
    .from(nonprofitProfiles)
    .where(
      and(
        isNotNull(nonprofitProfiles.verifiedAt),
        sql`${nonprofitProfiles.userId} <> ${userId}`,
        notExists(
          db.select({ one: sql`1` }).from(follows).where(and(eq(follows.followerId, userId), eq(follows.nonprofitId, nonprofitProfiles.userId))),
        ),
        causeSlug
          ? sql`exists (select 1 from ${nonprofitCauses} nc where nc.nonprofit_id = ${nonprofitProfiles.userId} and nc.cause_slug = ${causeSlug})`
          : undefined,
      ),
    )
    .orderBy(desc(sql`(select count(*) from ${follows} f where f.nonprofit_id = ${nonprofitProfiles.userId})`), asc(nonprofitProfiles.name))
    .limit(20);
}
