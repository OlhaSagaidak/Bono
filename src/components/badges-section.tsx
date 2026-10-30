import Link from "next/link";
import { BackerBadge } from "@/components/backer-badge";
import { Logo } from "@/components/profile-header";
import { getSponsorBadges, getSupporterBadges } from "@/lib/badges/queries";
import { nextSupporterStep, WINDOW_MONTHS } from "@/lib/badges/tiers";
import { formatCents } from "@/lib/donations/amounts";

/**
 * Badges on a supporter's or sponsor's profile: one per nonprofit they back.
 * Others see tiers only, and only when the owner shows badges; the owner also
 * sees what the next tier takes.
 */
export async function BadgesSection({
  userId,
  role,
  isOwner,
  showBadges,
}: {
  userId: string;
  role: "user" | "sponsor";
  isOwner: boolean;
  showBadges: boolean;
}) {
  if (!isOwner && !showBadges) return null;
  const items =
    role === "user"
      ? (await getSupporterBadges(userId)).map((b) => ({ nonprofit: b.nonprofit, badge: { kind: "supporter" as const, tier: b.tier }, next: nextSupporterStep(b.gifts, b.cents) }))
      : (await getSponsorBadges(userId)).map((b) => ({ nonprofit: b.nonprofit, badge: { kind: "sponsor" as const, tier: b.tier }, next: null }));
  if (items.length === 0 && !isOwner) return null;

  return (
    <section aria-labelledby="badges-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="badges-heading" className="text-xl font-semibold">
          {role === "user" ? "Supporter badges" : "Partner badges"}
        </h2>
        {isOwner && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {showBadges ? "Shown on your profile and comments." : "Hidden from others."}{" "}
            <Link href="/profile/edit" className="font-medium text-emerald-700 underline dark:text-emerald-400">
              Change
            </Link>
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          {role === "user"
            ? "Donate to a nonprofit to earn your first badge: Rising, then Emerging, Established and Champion."
            : "Fund a matching campaign or boost a nonprofit's post to earn partner badges."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ nonprofit, badge, next }) => (
            <li key={nonprofit.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
              <Logo name={nonprofit.name} imageId={nonprofit.logoImageId} size="size-10 text-base" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/nonprofits/${nonprofit.id}`} className="truncate font-medium hover:underline">
                  {nonprofit.name}
                </Link>
                {isOwner && next && (
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {next.label}: {next.gifts} more {next.gifts === 1 ? "gift" : "gifts"} or {formatCents(next.cents)} more
                  </span>
                )}
              </div>
              <BackerBadge badge={badge} of={nonprofit.name} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-zinc-600 dark:text-zinc-400">Based on the last {WINDOW_MONTHS} months. Amounts are never shown to others.</p>
    </section>
  );
}
