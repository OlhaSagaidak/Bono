import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getSponsorBoosts } from "@/lib/boosts/queries";
import { campaignState, getSponsorCampaigns } from "@/lib/matching/queries";
import type { NonprofitCampaignRow, NonprofitDonationRow, SponsorBoostRow, SponsorCampaignRow, SponsorMatchRow } from "./types";

// Dashboard rows for AG Studio. Every query is scoped to the signed-in
// organization; the page never passes another organization's id.

const dollars = (cents: number) => cents / 100;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const ratio = (percent: number) => `${percent / 100}:1`;

/** Completed donations to a nonprofit, with the sponsor match each one triggered, if any. */
export async function nonprofitDonations(nonprofitId: string): Promise<NonprofitDonationRow[]> {
  const { rows } = await db.execute<{
    id: string;
    completed_at: Date;
    amount_cents: number;
    donor: string;
    match_cents: number | null;
    sponsor: string | null;
    campaign: string | null;
  }>(sql`
    select d.id, d.completed_at, d.amount_cents, u.name as donor,
           m.amount_cents as match_cents, sp.name as sponsor, c.name as campaign
    from donations d
    join users u on u.id = d.donor_id
    left join matches m on m.donation_id = d.id and m.status <> 'failed'
    left join campaigns c on c.id = m.campaign_id
    left join sponsor_profiles sp on sp.user_id = c.sponsor_id
    where d.nonprofit_id = ${nonprofitId} and d.status = 'completed'
    order by d.completed_at desc`);
  return rows.map((r) => {
    const completed = new Date(r.completed_at);
    return {
      donation_id: r.id,
      date: isoDate(completed),
      month: isoDate(completed).slice(0, 7),
      amount: dollars(r.amount_cents),
      donor: r.donor,
      kind: r.match_cents ? "Matched" : "Direct",
      match_amount: dollars(r.match_cents ?? 0),
      sponsor: r.sponsor ?? "",
      campaign: r.campaign ?? "",
    };
  });
}

/** Funded campaigns that can match gifts to this nonprofit: by its causes, or naming it. */
export async function nonprofitCampaigns(nonprofitId: string): Promise<NonprofitCampaignRow[]> {
  const { rows } = await db.execute<{
    name: string;
    sponsor: string;
    ratio_percent: number;
    pool_cents: number;
    reserved_cents: number;
    status: string;
    starts_at: Date;
    ends_at: Date;
    to_you_cents: number;
  }>(sql`
    select c.name, sp.name as sponsor, c.ratio_percent, c.pool_cents, c.reserved_cents, c.status, c.starts_at, c.ends_at,
           (select coalesce(sum(m.amount_cents), 0) from matches m
             where m.campaign_id = c.id and m.nonprofit_id = ${nonprofitId} and m.status <> 'failed')::int as to_you_cents
    from campaigns c
    join sponsor_profiles sp on sp.user_id = c.sponsor_id
    where c.status = 'funded' and (
      c.cause_slug in (select cause_slug from nonprofit_causes where nonprofit_id = ${nonprofitId})
      or exists (select 1 from campaign_nonprofits cn where cn.campaign_id = c.id and cn.nonprofit_id = ${nonprofitId}))
    order by c.ends_at desc`);
  return rows.map((r) => ({
    campaign: r.name,
    sponsor: r.sponsor,
    ratio: ratio(r.ratio_percent),
    pool: dollars(r.pool_cents),
    used: dollars(r.reserved_cents),
    remaining: dollars(r.pool_cents - r.reserved_cents),
    matched_to_you: dollars(r.to_you_cents),
    state: campaignState({
      status: r.status,
      startsAt: new Date(r.starts_at),
      endsAt: new Date(r.ends_at),
      poolCents: r.pool_cents,
      reservedCents: r.reserved_cents,
    }),
  }));
}

/** Every match a sponsor's campaigns made (failed payouts are left out: that money went back to the pool). */
export async function sponsorMatches(sponsorId: string): Promise<SponsorMatchRow[]> {
  const { rows } = await db.execute<{
    id: string;
    created_at: Date;
    nonprofit: string;
    campaign: string;
    donation_cents: number;
    amount_cents: number;
    status: string;
  }>(sql`
    select m.id, m.created_at, n.name as nonprofit, c.name as campaign,
           d.amount_cents as donation_cents, m.amount_cents, m.status
    from matches m
    join campaigns c on c.id = m.campaign_id
    join nonprofit_profiles n on n.user_id = m.nonprofit_id
    join donations d on d.id = m.donation_id
    where c.sponsor_id = ${sponsorId} and m.status <> 'failed'
    order by m.created_at desc`);
  return rows.map((r) => {
    const created = new Date(r.created_at);
    return {
      match_id: r.id,
      date: isoDate(created),
      month: isoDate(created).slice(0, 7),
      nonprofit: r.nonprofit,
      campaign: r.campaign,
      donation_amount: dollars(r.donation_cents),
      match_amount: dollars(r.amount_cents),
      status: r.status === "paid" ? "Paid" : "On its way",
    };
  });
}

export async function sponsorCampaigns(sponsorId: string): Promise<SponsorCampaignRow[]> {
  return (await getSponsorCampaigns(sponsorId))
    .filter((c) => c.status === "funded")
    .map((c) => ({
      campaign: c.name,
      target: c.causeLabel ?? `${c.nonprofitCount} ${c.nonprofitCount === 1 ? "nonprofit" : "nonprofits"}`,
      ratio: ratio(c.ratioPercent),
      pool: dollars(c.poolCents),
      used: dollars(c.reservedCents),
      remaining: dollars(c.poolCents - c.reservedCents),
      state: c.state,
      starts: isoDate(c.startsAt),
      ends: isoDate(c.endsAt),
    }));
}

export async function sponsorBoosts(sponsorId: string): Promise<SponsorBoostRow[]> {
  return (await getSponsorBoosts(sponsorId)).map((b) => ({
    nonprofit: b.nonprofitName,
    post: b.postBody.length > 60 ? `${b.postBody.slice(0, 57)}…` : b.postBody,
    fee: dollars(b.amountCents),
    starts: isoDate(b.startsAt!),
    ends: b.endsAt ? isoDate(b.endsAt) : "",
    views: b.views,
    likes: b.likes,
    donations_since: dollars(b.donationsCents),
  }));
}
