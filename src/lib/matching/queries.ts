import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaignNonprofits, campaigns, causes, donations, matches, nonprofitProfiles } from "@/db/schema";

export type CampaignState = "needs-funding" | "scheduled" | "active" | "pool-used" | "ended";

export function campaignState(c: { status: string; startsAt: Date; endsAt: Date; poolCents: number; reservedCents: number }, now = Date.now()): CampaignState {
  if (c.status !== "funded") return "needs-funding";
  if (now >= c.endsAt.getTime()) return "ended";
  if (c.reservedCents >= c.poolCents) return "pool-used";
  if (now < c.startsAt.getTime()) return "scheduled";
  return "active";
}

/** A sponsor's campaigns, newest first, with what they target and how many matches they made. */
export async function getSponsorCampaigns(sponsorId: string) {
  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      causeLabel: causes.label,
      ratioPercent: campaigns.ratioPercent,
      capCents: campaigns.capCents,
      poolCents: campaigns.poolCents,
      reservedCents: campaigns.reservedCents,
      startsAt: campaigns.startsAt,
      endsAt: campaigns.endsAt,
      status: campaigns.status,
      matchCount: sql<number>`(select count(*) from ${matches} where ${matches.campaignId} = ${campaigns.id})::int`,
      nonprofitCount: sql<number>`(select count(*) from ${campaignNonprofits} where ${campaignNonprofits.campaignId} = ${campaigns.id})::int`,
    })
    .from(campaigns)
    .leftJoin(causes, eq(causes.slug, campaigns.causeSlug))
    .where(eq(campaigns.sponsorId, sponsorId))
    .orderBy(desc(campaigns.createdAt));
  return rows.map((r) => ({ ...r, state: campaignState(r) }));
}

/** One campaign (only for its own sponsor), with its nonprofits and every match. */
export async function getCampaign(id: string, sponsorId: string) {
  const [campaign] = (await getSponsorCampaigns(sponsorId)).filter((c) => c.id === id);
  if (!campaign) return null;
  const [nonprofits, matchRows, [{ matchedDonations }]] = await Promise.all([
    db
      .select({ id: nonprofitProfiles.userId, name: nonprofitProfiles.name })
      .from(campaignNonprofits)
      .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, campaignNonprofits.nonprofitId))
      .where(eq(campaignNonprofits.campaignId, id)),
    db
      .select({
        id: matches.id,
        nonprofitName: nonprofitProfiles.name,
        amountCents: matches.amountCents,
        donationCents: donations.amountCents,
        status: matches.status,
        payoutStatus: matches.payoutStatus,
        createdAt: matches.createdAt,
      })
      .from(matches)
      .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, matches.nonprofitId))
      .innerJoin(donations, eq(donations.id, matches.donationId))
      .where(eq(matches.campaignId, id))
      .orderBy(desc(matches.createdAt)),
    db
      .select({ matchedDonations: count() })
      .from(matches)
      .where(and(eq(matches.campaignId, id))),
  ]);
  return { ...campaign, nonprofits, matches: matchRows, matchedDonations };
}

/** Today and 30 days from now as YYYY-MM-DD, for the new-campaign form. */
export function defaultCampaignDates(now = Date.now()) {
  const day = (offset: number) => new Date(now + offset * 86_400_000).toISOString().slice(0, 10);
  return { today: day(0), inAMonth: day(30) };
}
