import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { PoolMeter } from "@/components/pool-meter";
import { getSession } from "@/lib/auth/session";
import { formatCents } from "@/lib/donations/amounts";
import { runPayoutQueue } from "@/lib/matching/matching";
import { getCampaign } from "@/lib/matching/queries";
import { payPalClientId } from "@/lib/paypal/public-config";
import { StateLabel } from "../state-label";
import { FundCheckout } from "./fund-checkout";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const MATCH_STATUS: Record<string, string> = {
  queued: "Queued",
  processing: "Sending",
  sent: "Sent, confirming",
  paid: "Paid",
  failed: "Failed, returned to pool",
};

export default function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/campaigns" className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400">
        ← All campaigns
      </Link>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Campaign params={params} />
      </Suspense>
    </main>
  );
}

async function Campaign({ params }: { params: PageProps<"/campaigns/[id]">["params"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "sponsor") redirect("/feed");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await getCampaign(id, session.user.id);
  if (!c) notFound();

  // Free hosting has no background worker: viewing the campaign nudges the
  // payout queue (after the page is sent) so match statuses stay current.
  if (c.matches.some((m) => m.status !== "paid" && m.status !== "failed")) {
    after(() => runPayoutQueue().catch((error) => console.error("Payout queue failed:", error)));
  }

  return (
    <>
      <title>{`${c.name} · Bono`}</title>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <StateLabel state={c.state} />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {[
          ["Matches", c.causeLabel ?? c.nonprofits.map((n) => n.name).join(", ")],
          ["Ratio", `${c.ratioPercent / 100} : 1`],
          ["Cap per donation", formatCents(c.capCents)],
          ["Dates", `${dateFormat.format(c.startsAt)} – ${dateFormat.format(c.endsAt)}`],
        ].map(([term, value]) => (
          <div key={term}>
            <dt className="text-zinc-600 dark:text-zinc-400">{term}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <PoolMeter usedCents={c.reservedCents} poolCents={c.poolCents} />

      {c.state === "needs-funding" && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-300 p-4 dark:border-amber-800">
          <h2 className="font-semibold">Fund the pool to start matching</h2>
          <p className="text-sm">
            Pay {formatCents(c.poolCents)} once, to Bono, through PayPal. Each match is then sent from the pool straight
            to the nonprofit with PayPal Payouts.
          </p>
          <FundCheckout campaignId={c.id} clientId={payPalClientId()} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Matches ({c.matches.length})</h2>
        {c.matches.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">No matches yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 font-medium">Nonprofit</th>
                <th className="py-1 text-right font-medium">Donation</th>
                <th className="py-1 text-right font-medium">Your match</th>
                <th className="py-1 pl-3 font-medium">Payout</th>
              </tr>
            </thead>
            <tbody>
              {c.matches.map((m) => (
                <tr key={m.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-2">{dateFormat.format(m.createdAt)}</td>
                  <td className="py-2">{m.nonprofitName}</td>
                  <td className="py-2 text-right">{formatCents(m.donationCents)}</td>
                  <td className="py-2 text-right font-medium">{formatCents(m.amountCents)}</td>
                  <td className="py-2 pl-3">{MATCH_STATUS[m.status] ?? m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
