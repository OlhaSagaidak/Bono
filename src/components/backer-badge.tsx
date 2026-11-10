import { Award, Crown, Handshake, Leaf, Sprout, TreeDeciduous } from "lucide-react";
import type { BackerTier } from "@/lib/badges/queries";
import { sponsorTierLabel, supporterTierLabel } from "@/lib/badges/tiers";

// A small pill: "Emerging supporter", "Partner". Tiers only, never amounts.
// Works in server and client components (no hooks).

// Black and white like the rest of Bono: the higher the tier, the darker the pill
// (inverted in dark mode), with the icon telling tiers apart at a glance.
const LIGHT = "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700";
const MID = "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100";
const DARK = "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900";
const TOP = "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950";
const STYLE = {
  rising: { Icon: Sprout, className: LIGHT },
  emerging: { Icon: Leaf, className: MID },
  established: { Icon: TreeDeciduous, className: DARK },
  champion: { Icon: Crown, className: TOP },
  supporter: { Icon: Handshake, className: LIGHT },
  partner: { Icon: Handshake, className: DARK },
  "champion-partner": { Icon: Award, className: TOP },
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
