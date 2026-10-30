import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { boosts, campaigns, donations, matches, nonprofitProfiles, posts, sponsorProfiles, users } from "@/db/schema";
import { sponsorTier, supporterTier, supporterTierLabel, WINDOW_MONTHS, type SponsorTier, type SupporterTier } from "./tiers";

// Who has backed which nonprofit, over the last WINDOW_MONTHS. Supporters:
// completed donations. Sponsors: matched gifts sent or paid to the nonprofit
// through their campaigns, plus paid boosts of its posts. Only verified
// nonprofits count (they're the only ones that can receive money anyway).

const windowStart = sql`now() - make_interval(months => ${WINDOW_MONTHS})`;

/** Completed donations per (donor, nonprofit) in the window. */
const giving = () => sql`(
  select d.donor_id as user_id, d.nonprofit_id, count(*)::int as gifts, sum(d.amount_cents)::int as cents
  from ${donations} d
  where d.status = 'completed' and d.completed_at > ${windowStart}
  group by d.donor_id, d.nonprofit_id
)`;

/** Matched gifts plus boosts per (sponsor, nonprofit) in the window. */
const sponsoring = () => sql`(
  select sponsor_id as user_id, nonprofit_id, sum(cents)::int as cents from (
    select c.sponsor_id, m.nonprofit_id, m.amount_cents as cents
    from ${matches} m join ${campaigns} c on c.id = m.campaign_id
    where m.status in ('sent', 'paid') and m.created_at > ${windowStart}
    union all
    select b.sponsor_id, p.nonprofit_id, b.amount_cents
    from ${boosts} b join ${posts} p on p.id = b.post_id
    where b.paypal_capture_id is not null and b.created_at > ${windowStart}
  ) x group by sponsor_id, nonprofit_id
)`;

type Org = { id: string; name: string; logoImageId: string | null };

export type SupporterBadge = { nonprofit: Org; tier: SupporterTier; gifts: number; cents: number };
export type SponsorBadge = { nonprofit: Org; tier: SponsorTier };

/** A supporter's badges, highest tier first. Includes amounts: only the owner may see those. */
export async function getSupporterBadges(userId: string): Promise<SupporterBadge[]> {
  const rows = await db.execute<{ id: string; name: string; logo: string | null; gifts: number; cents: number }>(sql`
    select n.user_id as id, n.name, n.logo_image_id as logo, g.gifts, g.cents
    from ${giving()} g join ${nonprofitProfiles} n on n.user_id = g.nonprofit_id
    where g.user_id = ${userId} and n.verified_at is not null`);
  return rows.rows
    .map((r) => ({ nonprofit: { id: r.id, name: r.name, logoImageId: r.logo }, tier: supporterTier(r.gifts, r.cents)!, gifts: r.gifts, cents: r.cents }))
    .filter((b) => b.tier)
    .sort((a, b) => b.cents - a.cents || b.gifts - a.gifts);
}

export async function getSponsorBadges(sponsorId: string): Promise<SponsorBadge[]> {
  const rows = await db.execute<{ id: string; name: string; logo: string | null; cents: number }>(sql`
    select n.user_id as id, n.name, n.logo_image_id as logo, s.cents
    from ${sponsoring()} s join ${nonprofitProfiles} n on n.user_id = s.nonprofit_id
    where s.user_id = ${sponsorId} and n.verified_at is not null
    order by s.cents desc`);
  return rows.rows.flatMap((r) => {
    const tier = sponsorTier(r.cents);
    return tier ? [{ nonprofit: { id: r.id, name: r.name, logoImageId: r.logo }, tier }] : [];
  });
}

export type BackerTier = { kind: "supporter"; tier: SupporterTier } | { kind: "sponsor"; tier: SponsorTier };

/** For comment threads: each author's tier with this nonprofit, for those who show badges. */
export async function backerTiersFor(nonprofitId: string, userIds: string[]): Promise<Map<string, BackerTier>> {
  const tiers = new Map<string, BackerTier>();
  if (userIds.length === 0) return tiers;
  const ids = sql.join(userIds.map((id) => sql`${id}::uuid`), sql`, `);
  const [given, sponsored] = await Promise.all([
    db.execute<{ user_id: string; gifts: number; cents: number }>(sql`
      select g.user_id, g.gifts, g.cents from ${giving()} g join ${users} u on u.id = g.user_id
      where g.nonprofit_id = ${nonprofitId} and g.user_id in (${ids}) and u.show_badges`),
    db.execute<{ user_id: string; cents: number }>(sql`
      select s.user_id, s.cents from ${sponsoring()} s join ${users} u on u.id = s.user_id
      where s.nonprofit_id = ${nonprofitId} and s.user_id in (${ids}) and u.show_badges`),
  ]);
  for (const r of given.rows) {
    const tier = supporterTier(r.gifts, r.cents);
    if (tier) tiers.set(r.user_id, { kind: "supporter", tier });
  }
  for (const r of sponsored.rows) {
    const tier = sponsorTier(r.cents);
    if (tier) tiers.set(r.user_id, { kind: "sponsor", tier });
  }
  return tiers;
}

export type Backer = { id: string; role: "user" | "sponsor"; name: string; photoImageId: string | null; badge: BackerTier };

/** A nonprofit's top backers (tiers only, never amounts), for its profile page. */
export async function getTopBackers(nonprofitId: string, limit = 12): Promise<Backer[]> {
  const [people, companies] = await Promise.all([
    db.execute<{ id: string; name: string; photo: string | null; gifts: number; cents: number }>(sql`
      select u.id, u.name, u.avatar_image_id as photo, g.gifts, g.cents
      from ${giving()} g join ${users} u on u.id = g.user_id
      where g.nonprofit_id = ${nonprofitId} and u.show_badges and u.role = 'user'
      order by g.cents desc, g.gifts desc limit ${limit}`),
    db.execute<{ id: string; name: string; photo: string | null; cents: number }>(sql`
      select u.id, coalesce(sp.name, u.name) as name, sp.logo_image_id as photo, s.cents
      from ${sponsoring()} s join ${users} u on u.id = s.user_id left join ${sponsorProfiles} sp on sp.user_id = u.id
      where s.nonprofit_id = ${nonprofitId} and u.show_badges
      order by s.cents desc limit ${limit}`),
  ]);
  const backers: (Backer & { rank: number })[] = [
    ...companies.rows.flatMap((r) => {
      const tier = sponsorTier(r.cents);
      return tier ? [{ id: r.id, role: "sponsor" as const, name: r.name, photoImageId: r.photo, badge: { kind: "sponsor" as const, tier }, rank: r.cents }] : [];
    }),
    ...people.rows.flatMap((r) => {
      const tier = supporterTier(r.gifts, r.cents);
      return tier ? [{ id: r.id, role: "user" as const, name: r.name, photoImageId: r.photo, badge: { kind: "supporter" as const, tier }, rank: r.cents }] : [];
    }),
  ];
  return backers
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((b) => ({ id: b.id, role: b.role, name: b.name, photoImageId: b.photoImageId, badge: b.badge }));
}

/** A donor's tier with a nonprofit right now, for the thank-you message. */
export async function currentSupporterTier(userId: string, nonprofitId: string): Promise<SupporterTier | null> {
  const rows = await db.execute<{ gifts: number; cents: number }>(sql`
    select g.gifts, g.cents from ${giving()} g where g.user_id = ${userId} and g.nonprofit_id = ${nonprofitId}`);
  const r = rows.rows[0];
  return r ? supporterTier(r.gifts, r.cents) : null;
}

/**
 * After a completed donation: the donor's tier with that nonprofit now, and
 * whether this gift moved them up (it's counted in the window already).
 */
export async function supporterTierAfterGift(
  userId: string,
  nonprofitId: string,
  amountCents: number,
): Promise<{ tier: SupporterTier; label: string; isNew: boolean } | null> {
  const rows = await db.execute<{ gifts: number; cents: number }>(sql`
    select g.gifts, g.cents from ${giving()} g where g.user_id = ${userId} and g.nonprofit_id = ${nonprofitId}`);
  const r = rows.rows[0];
  if (!r) return null;
  const tier = supporterTier(r.gifts, r.cents);
  if (!tier) return null;
  const before = supporterTier(r.gifts - 1, r.cents - amountCents);
  return { tier, label: `${supporterTierLabel(tier)} supporter`, isNew: before !== tier };
}
