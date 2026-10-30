import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BackerBadge } from "@/components/backer-badge";
import { getTopBackers } from "@/lib/badges/queries";
import { WINDOW_MONTHS } from "@/lib/badges/tiers";
import { profilePath } from "@/lib/profiles/paths";

/** A nonprofit's top supporters and sponsor partners: tiers only, never amounts. */
export async function TopBackers({ nonprofitId, nonprofitName }: { nonprofitId: string; nonprofitName: string }) {
  const backers = await getTopBackers(nonprofitId);
  if (backers.length === 0) return null;
  return (
    <section aria-labelledby="backers-heading" className="flex flex-col gap-3">
      <h2 id="backers-heading" className="text-xl font-semibold">
        Supporters
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {backers.map((b) => (
          <li key={b.id}>
            <Link
              href={profilePath(b.role, b.id)}
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 p-2.5 hover:border-emerald-600 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-800"
            >
              <Avatar name={b.name} imageId={b.photoImageId} className="size-9 text-sm" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{b.name}</span>
                <BackerBadge badge={b.badge} of={nonprofitName} size="xs" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">Over the last {WINDOW_MONTHS} months. People can hide their badges.</p>
    </section>
  );
}
