import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  causes,
  follows,
  nonprofitCauses,
  nonprofitProfiles,
  sponsorProfiles,
  userInterests,
  users,
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
  const bio = (await db.query.users.findFirst({ where: eq(users.id, userId), columns: { bio: true } }))?.bio ?? "";
  const causeRows = await db
    .select({ slug: causes.slug, label: causes.label })
    .from(nonprofitCauses)
    .innerJoin(causes, eq(causes.slug, nonprofitCauses.causeSlug))
    .where(eq(nonprofitCauses.nonprofitId, userId))
    .orderBy(asc(causes.sortOrder));
  return { ...profile, bio, causes: causeRows };
}

export async function getSponsorProfile(userId: string) {
  const profile = await db.query.sponsorProfiles.findFirst({ where: eq(sponsorProfiles.userId, userId) });
  if (!profile) return null;
  const account = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { bio: true, showBadges: true } });
  return { ...profile, bio: account?.bio ?? "", showBadges: account?.showBadges ?? true };
}

/** The bits of an account every profile shows: name, bio, photo. Photo: a supporter's own, else the logo. */
export async function getAccount(userId: string) {
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      name: users.name,
      bio: users.bio,
      avatarImageId: users.avatarImageId,
      showBadges: users.showBadges,
      nonprofitLogo: nonprofitProfiles.logoImageId,
      sponsorLogo: sponsorProfiles.logoImageId,
    })
    .from(users)
    .leftJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, users.id))
    .leftJoin(sponsorProfiles, eq(sponsorProfiles.userId, users.id))
    .where(eq(users.id, userId));
  if (!row) return null;
  const { nonprofitLogo, sponsorLogo, ...account } = row;
  return { ...account, photoImageId: row.role === "user" ? row.avatarImageId : (nonprofitLogo ?? sponsorLogo) };
}

/** How many people follow a nonprofit. */
export async function countFollowers(nonprofitId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(follows).where(eq(follows.nonprofitId, nonprofitId));
  return row.n;
}
