"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/donations/amounts";

// A post's fundraising goal: "Rex's surgery · $1,850 of $2,400 · 61 donors"
// with a progress bar. When the viewer gives from this post, the Donate
// dialog announces it (see `announceDonation`) and the bar moves right away,
// match included, without waiting for a reload.

export const DONATED_EVENT = "bono:donated";
export type DonatedDetail = {
  postId: string | null;
  amountCents: number;
  matchCents: number;
  // For the giving pulse on the feed, which shows the gift and its match.
  nonprofitId?: string;
  nonprofitName?: string;
  sponsorName?: string | null;
};

/** Tells any goal bar on the page that a gift just went through. */
export function announceDonation(detail: DonatedDetail) {
  window.dispatchEvent(new CustomEvent<DonatedDetail>(DONATED_EVENT, { detail }));
}

export function PostGoal({
  postId,
  title,
  goalCents,
  raisedCents,
  donors,
}: {
  postId: string;
  title: string;
  goalCents: number;
  raisedCents: number;
  donors: number;
}) {
  const [state, setState] = useState({ raisedCents, donors, justGave: false });

  useEffect(() => {
    function onDonated(e: Event) {
      const d = (e as CustomEvent<DonatedDetail>).detail;
      if (d.postId !== postId) return;
      setState((s) => ({ raisedCents: s.raisedCents + d.amountCents + d.matchCents, donors: s.donors + (s.justGave ? 0 : 1), justGave: true }));
    }
    window.addEventListener(DONATED_EVENT, onDonated);
    return () => window.removeEventListener(DONATED_EVENT, onDonated);
  }, [postId]);

  const percent = Math.min(100, Math.round((state.raisedCents / goalCents) * 100));
  const reached = state.raisedCents >= goalCents;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
          {state.donors} {state.donors === 1 ? "donor" : "donors"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${title}: ${formatCents(state.raisedCents)} of ${formatCents(goalCents)} raised`}
        aria-valuemin={0}
        aria-valuemax={goalCents}
        aria-valuenow={Math.min(state.raisedCents, goalCents)}
        className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-zinc-900 transition-[width] duration-700 ease-out motion-reduce:transition-none dark:bg-white"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm">
        <strong>{formatCents(state.raisedCents)}</strong>
        <span className="text-zinc-600 dark:text-zinc-400"> of {formatCents(goalCents)}</span>
        <span className="text-zinc-600 dark:text-zinc-400">
          {reached ? " · Goal reached 🎉" : ` · ${formatCents(goalCents - state.raisedCents)} to go`}
        </span>
        {state.justGave && <span className="font-medium"> · Thank you!</span>}
      </p>
    </div>
  );
}
