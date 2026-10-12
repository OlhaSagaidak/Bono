import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  causes,
  nonprofitCauses,
  nonprofitProfiles,
  sponsorProfiles,
  userInterests,
} from "@/db/schema";

export function getCauses() {
  return db.select().from(causes).orderBy(asc(causes.sortOrder));
}


export async function getInterestSlugs(userId: string) {
  const rows = await db
    .select({ slug: userInterests.causeSlug })
    .from(userInterests)
    .where(eq(userInterests.userId, userId));
  return rows.map((r) => r.slug);
}

export async function getNonprofitProfile(userId: string) {
  const profile = await db.query.nonprofitProfiles.findFirst({
    where: eq(nonprofitProfiles.userId, userId),
  });
  if (!profile) return null;
  const causeRows = await db
    .select({ slug: causes.slug, label: causes.label })
    .from(nonprofitCauses)
    .innerJoin(causes, eq(causes.slug, nonprofitCauses.causeSlug))
    .where(eq(nonprofitCauses.nonprofitId, userId))
    .orderBy(asc(causes.sortOrder));
  return { ...profile, causes: causeRows };
}

export function getSponsorProfile(userId: string) {
  return db.query.sponsorProfiles.findFirst({ where: eq(sponsorProfiles.userId, userId) });
}
