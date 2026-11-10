import { Monitor } from "lucide-react";
import { PoolMeter } from "@/components/pool-meter";
import type { DashboardData } from "@/lib/dashboards/types";

// The dashboard on a phone: the few numbers that matter, readable at a glance,
// instead of a grid of charts squeezed into a small screen. The full AG Studio
// dashboard (and its AI assistant) is one tap away on a larger screen.

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function Kpis({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3">
      {items.map((k) => (
        <div key={k.label} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <dt className="text-xs text-zinc-600 dark:text-zinc-400">{k.label}</dt>
          <dd className="text-2xl font-bold">{k.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Ranked({ title, rows }: { title: string; rows: { name: string; value: number; note?: string }[] }) {
  const top = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Nothing yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.name} className="flex flex-col gap-1">
              <span className="flex justify-between gap-3 text-sm">
                <span className="truncate">{r.name}</span>
                <span className="shrink-0 font-semibold">
                  {usd.format(r.value)}
                  {r.note && <span className="font-normal text-zinc-600 dark:text-zinc-400"> · {r.note}</span>}
                </span>
              </span>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <span className="block h-full rounded-full bg-zinc-900 dark:bg-white" style={{ width: `${(r.value / top) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function groupSum<T>(rows: T[], key: (r: T) => string, value: (r: T) => number) {
  const totals = new Map<string, { value: number; count: number }>();
  for (const r of rows) {
    const t = totals.get(key(r)) ?? { value: 0, count: 0 };
    totals.set(key(r), { value: t.value + value(r), count: t.count + 1 });
  }
  return [...totals.entries()].sort((a, b) => b[1].value - a[1].value);
}

export function DashboardSummary({ data }: { data: DashboardData }) {
  const pool = sum(data.campaigns.map((c) => c.pool));
  const used = sum(data.campaigns.map((c) => c.used));
  return (
    <div className="flex flex-col gap-6">
      {data.kind === "nonprofit" ? (
        <>
          <Kpis
            items={[
              { label: "Donations received", value: usd.format(sum(data.donations.map((d) => d.amount))) },
              { label: "Sponsor matches", value: usd.format(sum(data.donations.map((d) => d.match_amount))) },
              { label: "Gifts", value: String(data.donations.length) },
              { label: "Donors", value: String(new Set(data.donations.map((d) => d.donor)).size) },
            ]}
          />
          {pool > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-semibold">Matching pools that cover you</h2>
              <PoolMeter usedCents={Math.round(used * 100)} poolCents={Math.round(pool * 100)} />
            </section>
          )}
          <Ranked
            title="Top donors"
            rows={groupSum(data.donations, (d) => d.donor, (d) => d.amount)
              .slice(0, 5)
              .map(([name, t]) => ({ name, value: t.value, note: `${t.count} ${t.count === 1 ? "gift" : "gifts"}` }))}
          />
        </>
      ) : (
        <>
          <Kpis
            items={[
              { label: "Matching pools", value: usd.format(pool) },
              { label: "Matched to nonprofits", value: usd.format(sum(data.matches.map((m) => m.match_amount))) },
              { label: "Nonprofits reached", value: String(new Set(data.matches.map((m) => m.nonprofit)).size) },
              { label: "Donations after boosts", value: usd.format(sum(data.boosts.map((b) => b.donations_since))) },
            ]}
          />
          {pool > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-semibold">Pool used vs. remaining</h2>
              <PoolMeter usedCents={Math.round(used * 100)} poolCents={Math.round(pool * 100)} />
            </section>
          )}
          <Ranked
            title="Where your matches went"
            rows={groupSum(data.matches, (m) => m.nonprofit, (m) => m.match_amount).map(([name, t]) => ({
              name,
              value: t.value,
              note: `${t.count} ${t.count === 1 ? "match" : "matches"}`,
            }))}
          />
        </>
      )}
      <p className="flex items-start gap-2 rounded-xl bg-zinc-100 p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        <Monitor aria-hidden className="mt-0.5 size-4 shrink-0" />
        Open this page on a tablet or computer for the full dashboard: charts you can change, filters, and the AI assistant
        you can ask questions in plain English.
      </p>
    </div>
  );
}
