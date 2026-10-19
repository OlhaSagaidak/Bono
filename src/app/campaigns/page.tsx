import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PoolMeter } from "@/components/pool-meter";
import { getSession } from "@/lib/auth/session";
import { getSponsorBoosts } from "@/lib/boosts/queries";
import { formatCents } from "@/lib/donations/amounts";
import { getSponsorCampaigns, nowMs } from "@/lib/matching/queries";
import { StateLabel } from "./state-label";

export const metadata = { title: "Matching campaigns · Bono" };

export default function CampaignsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Matching campaigns</h1>
        <Link
          href="/campaigns/new"
          className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
        >
          New campaign
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Campaigns />
      </Suspense>
      <h2 className="mt-4 text-xl font-bold">Boosted posts</h2>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Boosts />
      </Suspense>
    </main>
  );
}

async function Campaigns() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "sponsor") redirect("/feed");
  const campaigns = await getSponsorCampaigns(session.user.id);
  if (campaigns.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        No campaigns yet. A matching campaign multiplies supporters&apos; donations to the causes you choose.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {campaigns.map((c) => (
        <li key={c.id}>
          <Link
            href={`/campaigns/${c.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 hover:border-emerald-600 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{c.name}</span>
              <StateLabel state={c.state} />
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {c.causeLabel ? `Matches ${c.causeLabel.toLowerCase()} nonprofits` : `Matches ${c.nonprofitCount} nonprofit${c.nonprofitCount === 1 ? "" : "s"}`}{" "}
              {c.ratioPercent / 100}:1 · {c.matchCount} match{c.matchCount === 1 ? "" : "es"}
            </span>
            <PoolMeter usedCents={c.reservedCents} poolCents={c.poolCents} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

async function Boosts() {
  const session = await getSession();
  if (!session || session.user.role !== "sponsor") return null;
  const boosts = await getSponsorBoosts(session.user.id);
  if (boosts.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No boosts yet. Use Boost on any post in your feed.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {boosts.map((b) => (
        <li key={b.id} className="flex flex-col gap-1 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <span className="font-semibold">{b.nonprofitName}</span>
          <span className="line-clamp-2 text-sm">{b.postBody}</span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {formatCents(b.amountCents)} · {dateFormat.format(b.startsAt!)} – {dateFormat.format(b.endsAt!)}
            {b.endsAt!.getTime() > nowMs() ? " · running" : " · ended"}
          </span>
          <span className="text-sm">
            Since the boost: {b.views} {b.views === 1 ? "person" : "people"} saw it · {b.likes} new like{b.likes === 1 ? "" : "s"} ·{" "}
            {formatCents(b.donationsCents)} donated from it
          </span>
        </li>
      ))}
    </ul>
  );
}
