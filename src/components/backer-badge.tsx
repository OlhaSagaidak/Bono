import { Award, Crown, Handshake, Leaf, Sprout, TreeDeciduous } from "lucide-react";
import type { BackerTier } from "@/lib/badges/queries";
import { sponsorTierLabel, supporterTierLabel } from "@/lib/badges/tiers";

// A small pill: "Emerging supporter", "Partner". Tiers only, never amounts.
// Works in server and client components (no hooks).

const STYLE = {
  rising: { Icon: Sprout, className: "bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-200" },
  emerging: { Icon: Leaf, className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  established: { Icon: TreeDeciduous, className: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200" },
  champion: { Icon: Crown, className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  supporter: { Icon: Handshake, className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200" },
  partner: { Icon: Handshake, className: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200" },
  "champion-partner": { Icon: Award, className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
} as const;

export function badgeText(badge: BackerTier): string {
  return badge.kind === "supporter" ? `${supporterTierLabel(badge.tier)} supporter` : `${sponsorTierLabel(badge.tier)}`;
}

export function BackerBadge({ badge, of, size = "sm" }: { badge: BackerTier; of?: string; size?: "xs" | "sm" }) {
  const { Icon, className } = STYLE[badge.tier];
  const text = badgeText(badge);
  return (
    <span
      title={of ? `${text} of ${of}` : text}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-medium ${className} ${size === "xs" ? "px-1.5 py-px text-[11px]" : "px-2.5 py-0.5 text-xs"}`}
    >
      <Icon aria-hidden className={size === "xs" ? "size-3" : "size-3.5"} />
      {text}
      {of && <span className="sr-only"> of {of}</span>}
    </span>
  );
}
