import { formatCents } from "@/lib/donations/amounts";

/** How much of a matching pool is used, as a labeled progress bar. */
export function PoolMeter({ usedCents, poolCents }: { usedCents: number; poolCents: number }) {
  const percent = poolCents > 0 ? Math.min(100, Math.round((usedCents / poolCents) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-label="Matching pool used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {formatCents(usedCents)} matched of {formatCents(poolCents)} · {formatCents(Math.max(0, poolCents - usedCents))} left
      </p>
    </div>
  );
}
