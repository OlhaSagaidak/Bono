import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, donations, matches, nonprofitProfiles, sponsorProfiles } from "@/db/schema";

// The giving pulse on the feed: the latest gifts across Bono and how much
// moved in the last 30 days. Never who gave: supporters are shown as tiers,
// not amounts (see lib/badges), so a gift here is an amount and a nonprofit.

export const PULSE_RECENT = 12;
const PULSE_DAYS = 30;

export type PulseGift = {
  id: string;
  amountCents: number;
  nonprofitId: string;
  nonprofitName: string;
  /** The sponsor whose campaign matched this gift, if one did. */
  sponsorName: string | null;
  matchCents: number;
  at: Date;
};

export type GivingPulse = { periodDays: number; periodCents: number; periodGifts: number; recent: PulseGift[]; fetchedAt: number };

export async function getGivingPulse(): Promise<GivingPulse> {
  const since = sql`now() - make_interval(days => ${PULSE_DAYS})`;
  const [[totals], recent] = await Promise.all([
    db
      .select({
        cents: sql<number>`coalesce(sum(${donations.amountCents}), 0)::int + coalesce((select sum(m.amount_cents) from ${matches} m join ${donations} d2 on d2.id = m.donation_id where d2.status = 'completed' and d2.completed_at >= ${since} and m.status <> 'failed'), 0)::int`,
        gifts: sql<number>`count(*)::int`,
      })
      .from(donations)
      .where(sql`${donations.status} = 'completed' and ${donations.completedAt} >= ${since}`),
    db
      .select({
        id: donations.id,
        amountCents: donations.amountCents,
        nonprofitId: nonprofitProfiles.userId,
        nonprofitName: nonprofitProfiles.name,
        sponsorName: sponsorProfiles.name,
        matchCents: sql<number | null>`${matches.amountCents}`,
        at: donations.completedAt,
      })
      .from(donations)
      .innerJoin(nonprofitProfiles, sql`${nonprofitProfiles.userId} = ${donations.nonprofitId} and ${nonprofitProfiles.verifiedAt} is not null`)
      .leftJoin(matches, sql`${matches.donationId} = ${donations.id} and ${matches.status} <> 'failed'`)
      .leftJoin(campaigns, sql`${campaigns.id} = ${matches.campaignId}`)
      .leftJoin(sponsorProfiles, sql`${sponsorProfiles.userId} = ${campaigns.sponsorId}`)
      .where(sql`${donations.status} = 'completed' and ${donations.completedAt} is not null`)
      .orderBy(sql`${donations.completedAt} desc`)
      .limit(PULSE_RECENT),
  ]);
  return {
    periodDays: PULSE_DAYS,
    periodCents: totals?.cents ?? 0,
    periodGifts: totals?.gifts ?? 0,
    recent: recent.map((r) => ({ ...r, at: r.at!, sponsorName: r.sponsorName ?? null, matchCents: r.matchCents ?? 0 })),
    fetchedAt: Date.now(),
  };
}
