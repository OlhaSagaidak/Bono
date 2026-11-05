// The rows a dashboard hands to AG Studio, which aggregates and filters them in
// the browser. Money is in dollars (Studio formats it as currency) and dates are
// ISO strings. Each dashboard only ever gets its own organization's rows.

export type NonprofitDonationRow = {
  donation_id: string;
  date: string; // ISO date the gift completed
  month: string; // "2026-10", for grouping by month
  amount: number;
  donor: string;
  kind: "Matched" | "Direct";
  match_amount: number; // what a sponsor added on top (0 when not matched)
  sponsor: string; // "" when not matched
  campaign: string;
};

export type NonprofitCampaignRow = {
  campaign: string;
  sponsor: string;
  ratio: string; // "1:1"
  pool: number;
  used: number;
  remaining: number;
  matched_to_you: number;
  state: string;
};

export type SponsorMatchRow = {
  match_id: string;
  date: string;
  month: string;
  nonprofit: string;
  campaign: string;
  donation_amount: number;
  match_amount: number;
  status: string;
};

export type SponsorCampaignRow = {
  campaign: string;
  target: string; // a cause, or "3 nonprofits"
  ratio: string;
  pool: number;
  used: number;
  remaining: number;
  state: string;
  starts: string;
  ends: string;
};

export type SponsorBoostRow = {
  nonprofit: string;
  post: string;
  fee: number;
  starts: string;
  ends: string;
  views: number;
  likes: number;
  donations_since: number;
};

export type DashboardData =
  | { kind: "nonprofit"; orgName: string; donations: NonprofitDonationRow[]; campaigns: NonprofitCampaignRow[] }
  | { kind: "sponsor"; orgName: string; matches: SponsorMatchRow[]; campaigns: SponsorCampaignRow[]; boosts: SponsorBoostRow[] };
