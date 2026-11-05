import type { AgDataSourcesDefinition, AgFieldDefinition, AgReportState } from "ag-studio";
import type { DashboardData } from "@/lib/dashboards/types";

// The dashboards each organization opens on: data sources with readable field
// names, and a starting report. Everything here is plain AG Studio state, so the
// organization (or the AI assistant) can change any of it in edit mode.

const text = (id: string, name: string, description?: string): AgFieldDefinition => ({ id, name, description, format: "textFormat" });
// "$1,250" or "$12.50": whole dollars without cents, like the rest of Bono.
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (id: string, name: string, description?: string): AgFieldDefinition => ({
  id,
  name,
  description,
  format: "currencyFormat",
  formatOptions: { format: usd },
});
const count = (id: string, name: string, description?: string): AgFieldDefinition => ({ id, name, description, format: "integerFormat" });
const date = (id: string, name: string): AgFieldDefinition => ({ id, name, format: "dateFormat" });

const title = (t: string) => ({ title: { enabled: true, text: t } });
const kpi = (label: string) => ({ style: { label: { enabled: true, text: label } } });

export function dataSources(data: DashboardData): AgDataSourcesDefinition {
  if (data.kind === "nonprofit") {
    return {
      sources: [
        {
          id: "donations",
          name: "Donations",
          data: data.donations,
          fields: [
            text("donation_id", "Donation"),
            date("date", "Date"),
            text("month", "Month"),
            money("amount", "Amount", "What the donor gave, paid straight to this nonprofit's PayPal account"),
            text("donor", "Donor"),
            text("kind", "Matched or direct", "Matched when a sponsor campaign added a matching gift"),
            money("match_amount", "Sponsor match", "Matching gift a sponsor paid on top, via PayPal Payouts"),
            text("sponsor", "Matching sponsor"),
            text("campaign", "Matching campaign"),
          ],
        },
        {
          id: "campaigns",
          name: "Matching campaigns",
          data: data.campaigns,
          fields: [
            text("campaign", "Campaign"),
            text("sponsor", "Sponsor"),
            text("ratio", "Match ratio"),
            money("pool", "Pool", "Total the sponsor put in for matching"),
            money("used", "Pool used", "Matched so far, to every nonprofit in the campaign"),
            money("remaining", "Pool left"),
            money("matched_to_you", "Matched to you"),
            text("state", "State"),
          ],
        },
      ],
    };
  }
  return {
    sources: [
      {
        id: "matches",
        name: "Matches",
        data: data.matches,
        fields: [
          text("match_id", "Match"),
          date("date", "Date"),
          text("month", "Month"),
          text("nonprofit", "Nonprofit"),
          text("campaign", "Campaign"),
          money("donation_amount", "Donation", "The supporter's gift that was matched"),
          money("match_amount", "Match", "What this sponsor paid the nonprofit, via PayPal Payouts"),
          text("status", "Payout status"),
        ],
      },
      {
        id: "campaigns",
        name: "Campaigns",
        data: data.campaigns,
        fields: [
          text("campaign", "Campaign"),
          text("target", "Matches"),
          text("ratio", "Match ratio"),
          money("pool", "Pool"),
          money("used", "Pool used"),
          money("remaining", "Pool left"),
          text("state", "State"),
          date("starts", "Starts"),
          date("ends", "Ends"),
        ],
      },
      {
        id: "boosts",
        name: "Boosted posts",
        data: data.boosts,
        fields: [
          text("nonprofit", "Nonprofit"),
          text("post", "Post"),
          money("fee", "Boost fee"),
          date("starts", "Starts"),
          date("ends", "Ends"),
          count("views", "People reached", "People who saw the post since the boost started"),
          count("likes", "New likes"),
          money("donations_since", "Donations since boost"),
        ],
      },
    ],
  };
}

export function initialReport(kind: DashboardData["kind"]): AgReportState {
  const panels = { filters: { collapsed: true }, data: { collapsed: true }, edit: { collapsed: true } };
  if (kind === "nonprofit") {
    return {
      selectedPageId: "overview",
      panels,
      pages: [
        {
          id: "overview",
          widgets: {
            raised: { type: "value", dataMapping: { value: [{ id: "donations.amount", aggregation: "sum" }] }, format: kpi("Donations received") },
            matched: { type: "value", dataMapping: { value: [{ id: "donations.match_amount", aggregation: "sum" }] }, format: kpi("Sponsor matches") },
            gifts: { type: "value", dataMapping: { value: [{ id: "donations.donation_id", aggregation: "count" }] }, format: kpi("Gifts") },
            donors: { type: "value", dataMapping: { value: [{ id: "donations.donor", aggregation: "countd" }] }, format: kpi("Donors") },
            "by-month": {
              type: "column-chart-stacked",
              dataMapping: {
                categoryKey: [{ id: "donations.month" }],
                valueKey: [{ id: "donations.amount", aggregation: "sum" }],
                legendKey: [{ id: "donations.kind" }],
              },
              sort: [{ field: { id: "donations.month" }, direction: "asc" }],
              format: title("Donations by month, matched vs. direct"),
            },
            pool: {
              type: "pool-meter",
              dataMapping: { used: [{ id: "campaigns.used", aggregation: "sum" }], pool: [{ id: "campaigns.pool", aggregation: "sum" }] },
              format: title("Matching pools that cover you"),
            },
            "top-donors": {
              type: "grid",
              dataMapping: {
                cols: [
                  { id: "donations.donor" },
                  { id: "donations.donation_id", aggregation: "count" },
                  { id: "donations.amount", aggregation: "sum" },
                ],
              },
              sort: [{ field: { id: "donations.amount", aggregation: "sum" }, direction: "desc" }],
              format: title("Top donors"),
            },
            campaigns: {
              type: "grid",
              dataMapping: {
                cols: [
                  { id: "campaigns.campaign" },
                  { id: "campaigns.sponsor" },
                  { id: "campaigns.ratio" },
                  { id: "campaigns.matched_to_you", aggregation: "sum" },
                  { id: "campaigns.remaining", aggregation: "sum" },
                  { id: "campaigns.state" },
                ],
              },
              format: title("Campaign progress"),
            },
          },
          widgetLayout: {
            raised: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 6 },
            matched: { xTrack: 6, yTrack: 0, xSpan: 6, ySpan: 6 },
            gifts: { xTrack: 12, yTrack: 0, xSpan: 6, ySpan: 6 },
            donors: { xTrack: 18, yTrack: 0, xSpan: 6, ySpan: 6 },
            "by-month": { xTrack: 0, yTrack: 6, xSpan: 16, ySpan: 16 },
            pool: { xTrack: 16, yTrack: 6, xSpan: 8, ySpan: 16 },
            "top-donors": { xTrack: 0, yTrack: 22, xSpan: 10, ySpan: 16 },
            campaigns: { xTrack: 10, yTrack: 22, xSpan: 14, ySpan: 16 },
          },
        },
        {
          id: "gifts",
          widgets: {
            kind: { type: "list-filter", dataMapping: { value: [{ id: "donations.kind" }] }, format: title("Matched or direct") },
            sponsor: { type: "list-filter", dataMapping: { value: [{ id: "donations.sponsor" }] }, format: title("Matching sponsor") },
            all: {
              type: "grid",
              dataMapping: {
                cols: [
                  { id: "donations.date" },
                  { id: "donations.donor" },
                  { id: "donations.amount" },
                  { id: "donations.kind" },
                  { id: "donations.match_amount" },
                  { id: "donations.sponsor" },
                  { id: "donations.campaign" },
                ],
              },
              sort: [{ field: { id: "donations.date" }, direction: "desc" }],
              format: title("Every gift"),
            },
          },
          widgetLayout: {
            kind: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 12 },
            sponsor: { xTrack: 0, yTrack: 12, xSpan: 6, ySpan: 20 },
            all: { xTrack: 6, yTrack: 0, xSpan: 18, ySpan: 32 },
          },
        },
      ],
    } as AgReportState;
  }
  return {
    selectedPageId: "overview",
    panels,
    pages: [
      {
        id: "overview",
        widgets: {
          pool: { type: "value", dataMapping: { value: [{ id: "campaigns.pool", aggregation: "sum" }] }, format: kpi("Matching pools") },
          matched: { type: "value", dataMapping: { value: [{ id: "matches.match_amount", aggregation: "sum" }] }, format: kpi("Matched to nonprofits") },
          reached: { type: "value", dataMapping: { value: [{ id: "matches.nonprofit", aggregation: "countd" }] }, format: kpi("Nonprofits reached") },
          boosted: { type: "value", dataMapping: { value: [{ id: "boosts.donations_since", aggregation: "sum" }] }, format: kpi("Donations after boosts") },
          meter: {
            type: "pool-meter",
            dataMapping: { used: [{ id: "campaigns.used", aggregation: "sum" }], pool: [{ id: "campaigns.pool", aggregation: "sum" }] },
            format: title("Pool used vs. remaining"),
          },
          recipients: {
            type: "donut-chart",
            dataMapping: { categoryKey: [{ id: "matches.nonprofit" }], valueKey: [{ id: "matches.match_amount", aggregation: "sum" }] },
            format: title("Where your matches went"),
          },
          "by-month": {
            type: "column-chart-grouped",
            dataMapping: { categoryKey: [{ id: "matches.month" }], valueKey: [{ id: "matches.match_amount", aggregation: "sum" }] },
            sort: [{ field: { id: "matches.month" }, direction: "asc" }],
            format: title("Matches by month"),
          },
          campaigns: {
            type: "grid",
            dataMapping: {
              cols: [
                { id: "campaigns.campaign" },
                { id: "campaigns.target" },
                { id: "campaigns.ratio" },
                { id: "campaigns.used", aggregation: "sum" },
                { id: "campaigns.remaining", aggregation: "sum" },
                { id: "campaigns.state" },
              ],
            },
            format: title("Campaigns"),
          },
        },
        widgetLayout: {
          pool: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 6 },
          matched: { xTrack: 6, yTrack: 0, xSpan: 6, ySpan: 6 },
          reached: { xTrack: 12, yTrack: 0, xSpan: 6, ySpan: 6 },
          boosted: { xTrack: 18, yTrack: 0, xSpan: 6, ySpan: 6 },
          meter: { xTrack: 0, yTrack: 6, xSpan: 8, ySpan: 16 },
          recipients: { xTrack: 8, yTrack: 6, xSpan: 8, ySpan: 16 },
          "by-month": { xTrack: 16, yTrack: 6, xSpan: 8, ySpan: 16 },
          campaigns: { xTrack: 0, yTrack: 22, xSpan: 24, ySpan: 14 },
        },
      },
      {
        id: "boosts",
        widgets: {
          results: {
            type: "bar-chart-grouped",
            dataMapping: { categoryKey: [{ id: "boosts.post" }], valueKey: [{ id: "boosts.views", aggregation: "sum" }, { id: "boosts.likes", aggregation: "sum" }] },
            format: title("Reach and likes per boosted post"),
          },
          table: {
            type: "grid",
            dataMapping: {
              cols: [
                { id: "boosts.nonprofit" },
                { id: "boosts.post" },
                { id: "boosts.starts" },
                { id: "boosts.ends" },
                { id: "boosts.fee" },
                { id: "boosts.views" },
                { id: "boosts.likes" },
                { id: "boosts.donations_since" },
              ],
            },
            format: title("Every boost"),
          },
        },
        widgetLayout: {
          results: { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 14 },
          table: { xTrack: 0, yTrack: 14, xSpan: 24, ySpan: 16 },
        },
      },
    ],
  } as AgReportState;
}
