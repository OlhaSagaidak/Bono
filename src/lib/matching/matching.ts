import "server-only";
import { and, asc, eq, exists, gt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  campaignNonprofits,
  campaigns,
  donations,
  matches,
  nonprofitCauses,
  nonprofitProfiles,
  sponsorProfiles,
} from "@/db/schema";
import { createPayout, getPayoutItem, type PayoutItemStatus } from "@/lib/paypal/payouts";

// Sponsor matching: when a donation completes, an active campaign that covers
// the nonprofit adds a matching gift, paid from the sponsor's pool to the
// nonprofit through PayPal Payouts. Money only ever moves once per donation:
// matches.donation_id is unique, and each payout's sender_batch_id is the
// match id, which PayPal never pays twice.

export type MatchInfo = { sponsorName: string; amountCents: number };

/** Active = funded, within its dates, with pool left. */
const isActive = () =>
  and(
    eq(campaigns.status, "funded"),
    lte(campaigns.startsAt, sql`now()`),
    gt(campaigns.endsAt, sql`now()`),
    sql`${campaigns.reservedCents} < ${campaigns.poolCents}`,
  );

/** Campaigns that would match a donation to this nonprofit right now, ending soonest first. */
export function activeCampaignsFor(nonprofitId: string) {
  return db
    .select({
      id: campaigns.id,
      ratioPercent: campaigns.ratioPercent,
      capCents: campaigns.capCents,
      sponsorName: sponsorProfiles.name,
    })
    .from(campaigns)
    .innerJoin(sponsorProfiles, eq(sponsorProfiles.userId, campaigns.sponsorId))
    .where(
      and(
        isActive(),
        or(
          exists(
            db
              .select({ one: sql`1` })
              .from(nonprofitCauses)
              .where(and(eq(nonprofitCauses.nonprofitId, nonprofitId), eq(nonprofitCauses.causeSlug, campaigns.causeSlug))),
          ),
          exists(
            db
              .select({ one: sql`1` })
              .from(campaignNonprofits)
              .where(and(eq(campaignNonprofits.campaignId, campaigns.id), eq(campaignNonprofits.nonprofitId, nonprofitId))),
          ),
        ),
      ),
    )
    .orderBy(asc(campaigns.endsAt));
}

/**
 * Matches a completed donation, if a campaign covers it. Safe to call any
 * number of times for the same donation (capture action, webhook, retries).
 */
export async function matchDonation(donationId: string): Promise<MatchInfo | null> {
  const existing = await existingMatch(donationId);
  if (existing !== undefined) return existing;

  const [donation] = await db
    .select({
      id: donations.id,
      status: donations.status,
      amountCents: donations.amountCents,
      nonprofitId: donations.nonprofitId,
      receiverEmail: nonprofitProfiles.paypalPayeeEmail,
      verifiedAt: nonprofitProfiles.verifiedAt,
    })
    .from(donations)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, donations.nonprofitId))
    .where(eq(donations.id, donationId));
  if (!donation || donation.status !== "completed" || !donation.verifiedAt) return null;

  for (const campaign of await activeCampaignsFor(donation.nonprofitId)) {
    const wanted = Math.min(Math.round((donation.amountCents * campaign.ratioPercent) / 100), campaign.capCents);
    if (wanted < 1) continue;

    // One transaction, with the campaign row locked, so two donations at once
    // can't overspend the pool: read what's left, record the match, reserve it.
    const outcome = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ poolCents: campaigns.poolCents, reservedCents: campaigns.reservedCents })
        .from(campaigns)
        .where(and(eq(campaigns.id, campaign.id), isActive()))
        .for("update");
      if (!locked) return "skip" as const;
      const amount = Math.min(wanted, locked.poolCents - locked.reservedCents);
      if (amount < 1) return "skip" as const;

      // Unique donation_id: if this donation was matched meanwhile, stop here.
      const inserted = await tx
        .insert(matches)
        .values({
          campaignId: campaign.id,
          donationId: donation.id,
          nonprofitId: donation.nonprofitId,
          amountCents: amount,
          receiverEmail: donation.receiverEmail,
        })
        .onConflictDoNothing({ target: matches.donationId })
        .returning({ id: matches.id });
      if (inserted.length === 0) return "alreadyMatched" as const;

      await tx
        .update(campaigns)
        .set({ reservedCents: sql`${campaigns.reservedCents} + ${amount}` })
        .where(eq(campaigns.id, campaign.id));
      return amount;
    });

    if (outcome === "alreadyMatched") return (await existingMatch(donationId)) ?? null;
    if (outcome !== "skip") return { sponsorName: campaign.sponsorName, amountCents: outcome };
  }
  return null;
}

async function existingMatch(donationId: string): Promise<MatchInfo | null | undefined> {
  const [row] = await db
    .select({ amountCents: matches.amountCents, sponsorName: sponsorProfiles.name })
    .from(matches)
    .innerJoin(campaigns, eq(campaigns.id, matches.campaignId))
    .innerJoin(sponsorProfiles, eq(sponsorProfiles.userId, campaigns.sponsorId))
    .where(eq(matches.donationId, donationId));
  return row ?? undefined;
}

const FAILED_STATUSES = new Set<PayoutItemStatus>(["FAILED", "RETURNED", "BLOCKED", "REFUNDED", "REVERSED"]);

async function failMatch(matchId: string, error: string) {
  await db.transaction(async (tx) => {
    const [m] = await tx
      .update(matches)
      .set({ status: "failed", error })
      .where(and(eq(matches.id, matchId), sql`${matches.status} <> 'failed'`))
      .returning({ campaignId: matches.campaignId, amountCents: matches.amountCents });
    // Give the money back to the pool, so it can match another donation.
    if (m) {
      await tx
        .update(campaigns)
        .set({ reservedCents: sql`greatest(0, ${campaigns.reservedCents} - ${m.amountCents})` })
        .where(eq(campaigns.id, m.campaignId));
    }
  });
}

/**
 * The payout queue: sends queued matches, then checks on sent ones. Runs after
 * a response has gone out (Next's after()), so it never slows a donor down,
 * and it's safe to run concurrently or repeatedly.
 */
export async function runPayoutQueue(): Promise<{ sent: number; paid: number; failed: number }> {
  const counts = { sent: 0, paid: 0, failed: 0 };

  // A run that crashed mid-payout leaves rows in "processing": retry them.
  // Retrying is safe, since PayPal pays a sender_batch_id only once.
  await db
    .update(matches)
    .set({ status: "queued" })
    .where(and(eq(matches.status, "processing"), sql`${matches.updatedAt} < now() - interval '10 minutes'`));

  // Claim a few queued matches; SKIP LOCKED keeps concurrent runs off each other's rows.
  const claimed = await db.execute<{ id: string; receiver_email: string; amount_cents: number }>(sql`
    update ${matches} set status = 'processing', updated_at = now()
    where id in (select id from ${matches} where status = 'queued' order by created_at limit 10 for update skip locked)
    returning id, receiver_email, amount_cents`);

  for (const m of claimed.rows) {
    try {
      const result = await createPayout({
        id: m.id,
        receiverEmail: m.receiver_email,
        amountCents: m.amount_cents,
        note: "A sponsor matched a donation made to you on Bono.",
      });
      if (result.kind === "created") {
        await db.update(matches).set({ status: "sent", payoutBatchId: result.batchId }).where(eq(matches.id, m.id));
        counts.sent++;
      } else {
        console.warn(`Payout for match ${m.id} refused: ${result.status} ${result.name ?? ""} debug_id=${result.debugId ?? "?"}`);
        await failMatch(m.id, result.name ?? `HTTP ${result.status}`);
        counts.failed++;
      }
    } catch (error) {
      // Network trouble: put it back; the next run retries with the same sender_batch_id.
      console.error(`Payout for match ${m.id} didn't go through, will retry:`, error);
      await db.update(matches).set({ status: "queued" }).where(eq(matches.id, m.id));
    }
  }

  const sent = await db
    .select({ id: matches.id, batchId: matches.payoutBatchId })
    .from(matches)
    .where(eq(matches.status, "sent"))
    .limit(25);
  for (const m of sent) {
    if (!m.batchId) continue;
    const item = await getPayoutItem(m.batchId).catch(() => null);
    if (!item) continue;
    if (item.status === "SUCCESS") {
      await db.update(matches).set({ status: "paid", payoutItemId: item.itemId, payoutStatus: item.status }).where(eq(matches.id, m.id));
      counts.paid++;
    } else if (FAILED_STATUSES.has(item.status)) {
      await db.update(matches).set({ payoutItemId: item.itemId, payoutStatus: item.status }).where(eq(matches.id, m.id));
      await failMatch(m.id, item.error ?? item.status);
      counts.failed++;
    } else {
      // PENDING, UNCLAIMED, ONHOLD: still on its way; check again next run.
      await db.update(matches).set({ payoutItemId: item.itemId, payoutStatus: item.status }).where(eq(matches.id, m.id));
    }
  }
  return counts;
}

/** Sponsors of active campaigns that cover each of these nonprofits (for "Matched by" labels). */
export async function matchingSponsorsFor(nonprofitIds: string[]): Promise<Map<string, { sponsorName: string; ratioPercent: number }>> {
  const result = new Map<string, { sponsorName: string; ratioPercent: number }>();
  if (nonprofitIds.length === 0) return result;
  const rows = await db.execute<{ nonprofit_id: string; sponsor_name: string; ratio_percent: number }>(sql`
    select distinct on (n.user_id) n.user_id as nonprofit_id, s.name as sponsor_name, c.ratio_percent
    from ${nonprofitProfiles} n
    join ${campaigns} c on c.status = 'funded' and c.starts_at <= now() and c.ends_at > now() and c.reserved_cents < c.pool_cents
    join ${sponsorProfiles} s on s.user_id = c.sponsor_id
    where n.user_id in (${sql.join(nonprofitIds.map((id) => sql`${id}::uuid`), sql`, `)})
      and (exists (select 1 from ${nonprofitCauses} nc where nc.nonprofit_id = n.user_id and nc.cause_slug = c.cause_slug)
        or exists (select 1 from ${campaignNonprofits} cn where cn.campaign_id = c.id and cn.nonprofit_id = n.user_id))
    order by n.user_id, c.ends_at`);
  for (const r of rows.rows) result.set(r.nonprofit_id, { sponsorName: r.sponsor_name, ratioPercent: r.ratio_percent });
  return result;
}

