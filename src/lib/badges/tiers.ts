// Badges: how much someone has backed one nonprofit over the last 12 months.
// One tier per person per nonprofit, shown publicly as the tier only (never
// amounts), unless they turn badges off. Free of database code, so the
// rules are easy to read and test.

export const WINDOW_MONTHS = 12;

/** Supporters: whichever comes first, the number of gifts or the total given. */
export const SUPPORTER_TIERS = [
  { key: "champion", label: "Champion", gifts: 12, cents: 100_000 },
  { key: "established", label: "Established", gifts: 6, cents: 50_000 },
  { key: "emerging", label: "Emerging", gifts: 3, cents: 10_000 },
  { key: "rising", label: "Rising", gifts: 1, cents: 1 },
] as const;
export type SupporterTier = (typeof SUPPORTER_TIERS)[number]["key"];

/** Sponsors: matched gifts paid to the nonprofit plus boosts of its posts. */
export const SPONSOR_TIERS = [
  { key: "champion-partner", label: "Champion Partner", cents: 100_000 },
  { key: "partner", label: "Partner", cents: 25_000 },
  { key: "supporter", label: "Supporter", cents: 1 },
] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number]["key"];

export function supporterTier(gifts: number, cents: number): SupporterTier | null {
  return SUPPORTER_TIERS.find((t) => gifts >= t.gifts || cents >= t.cents)?.key ?? null;
}

export function sponsorTier(cents: number): SponsorTier | null {
  return SPONSOR_TIERS.find((t) => cents >= t.cents)?.key ?? null;
}

export const supporterTierLabel = (tier: SupporterTier) => SUPPORTER_TIERS.find((t) => t.key === tier)!.label;
export const sponsorTierLabel = (tier: SponsorTier) => SPONSOR_TIERS.find((t) => t.key === tier)!.label;

/**
 * What it takes to reach the next supporter tier, for the person's own eyes:
 * "2 more gifts or $40 more". Null at the top tier.
 */
export function nextSupporterStep(gifts: number, cents: number): { label: string; gifts: number; cents: number } | null {
  const current = supporterTier(gifts, cents);
  const index = current ? SUPPORTER_TIERS.findIndex((t) => t.key === current) : SUPPORTER_TIERS.length;
  if (index === 0) return null;
  const next = SUPPORTER_TIERS[index - 1];
  return { label: next.label, gifts: Math.max(0, next.gifts - gifts), cents: Math.max(0, next.cents - cents) };
}
