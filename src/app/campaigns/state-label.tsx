import type { CampaignState } from "@/lib/matching/queries";

const LABELS: Record<CampaignState, { text: string; className: string }> = {
  "needs-funding": { text: "Needs funding", className: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100" },
  scheduled: { text: "Scheduled", className: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" },
  active: { text: "Active", className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  "pool-used": { text: "Pool used up", className: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" },
  ended: { text: "Ended", className: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" },
};

export function StateLabel({ state }: { state: CampaignState }) {
  const l = LABELS[state];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${l.className}`}>{l.text}</span>;
}
