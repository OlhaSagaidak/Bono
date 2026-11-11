"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/donations/amounts";
import type { GivingPulse, PulseGift } from "@/lib/donations/pulse";
import { DONATED_EVENT, type DonatedDetail } from "@/components/post-goal";

// The giving pulse at the top of the feed: what moved through Bono in the
// last 30 days, and the latest gifts drifting by. When the viewer gives, their
// gift joins the front of the line at once (the Donate dialog announces it).

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const wholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
function ago(at: number, now: number) {
  const minutes = Math.round((at - now) / 60_000);
  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

type Shown = Omit<PulseGift, "at"> & { at: number; mine?: boolean };

export function GivingPulse({ pulse }: { pulse: GivingPulse }) {
  const [gifts, setGifts] = useState<Shown[]>(() => pulse.recent.map((g) => ({ ...g, at: g.at.getTime() })));
  const [extraCents, setExtraCents] = useState(0);
  const [extraGifts, setExtraGifts] = useState(0);
  // The viewer's own gift: start the row afresh and hold it still for a moment, so they see it land.
  const [hold, setHold] = useState(false);

  useEffect(() => {
    function onDonated(e: Event) {
      const d = (e as CustomEvent<DonatedDetail>).detail;
      if (!d.nonprofitId || !d.nonprofitName) return;
      const mine: Shown = {
        id: `mine-${Date.now()}`,
        amountCents: d.amountCents,
        nonprofitId: d.nonprofitId,
        nonprofitName: d.nonprofitName,
        sponsorName: d.sponsorName ?? null,
        matchCents: d.matchCents,
        at: Date.now(),
        mine: true,
      };
      setGifts((g) => [mine, ...g].slice(0, 12));
      setExtraCents((c) => c + d.amountCents + d.matchCents);
      setExtraGifts((n) => n + 1);
      setHold(true);
      clearTimeout(timer);
      timer = setTimeout(() => setHold(false), 8_000);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener(DONATED_EVENT, onDonated);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(DONATED_EVENT, onDonated);
    };
  }, []);

  if (gifts.length === 0) return null;
  // Times are relative to when the page was fetched, so server and client agree.
  const now = pulse.fetchedAt;
  const chips = gifts.map((g) => (
    <li
      key={g.id}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
        g.mine
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <span className="font-semibold">{g.mine ? `Your ${formatCents(g.amountCents)}` : formatCents(g.amountCents)}</span>
      <span aria-hidden>→</span>
      <Link href={`/nonprofits/${g.nonprofitId}`} className="hover:underline">
        {g.nonprofitName}
      </Link>
      {g.sponsorName && g.matchCents > 0 && (
        <span className={g.mine ? "opacity-80" : "text-zinc-600 dark:text-zinc-400"}>· matched by {g.sponsorName}</span>
      )}
      <span className={g.mine ? "opacity-80" : "text-zinc-600 dark:text-zinc-400"}>· {g.mine ? "just now" : ago(g.at, now)}</span>
    </li>
  ));

  return (
    <section aria-label="The giving pulse" className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="flex items-center gap-2 text-sm">
        <span className="relative flex size-2.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <Activity aria-hidden className="size-4" />
        <span>
          <strong>{wholeDollars.format(Math.round((pulse.periodCents + extraCents) / 100))}</strong> given through Bono in the last {pulse.periodDays} days ·{" "}
          {(pulse.periodGifts + extraGifts).toLocaleString("en-US")} gifts
        </span>
      </p>
      {/* A slow drift, paused on hover and off entirely for reduced motion; the
          row is duplicated (hidden from assistive tech) so the loop is seamless. */}
      <div className="group -mx-3 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 0.75rem, black calc(100% - 1.5rem), transparent)" }}>
        <div
          // Keyed by the first gift: a new one restarts the drift from the front.
          key={gifts[0].id}
          className="flex w-max gap-2 px-3 motion-safe:animate-[pulse-drift_60s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
          style={hold ? { animationPlayState: "paused" } : undefined}
        >
          <ul className="flex gap-2">{chips}</ul>
          <ul className="flex gap-2 motion-reduce:hidden" aria-hidden inert>
            {chips}
          </ul>
        </div>
      </div>
    </section>
  );
}
