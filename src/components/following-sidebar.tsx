import Link from "next/link";
import { Logo } from "@/components/profile-header";
import { SidebarEmpty, SidebarSection } from "@/components/sidebar-section";
import { countFollowedOrgs, getFollowedOrgs } from "@/lib/engagement/queries";

const SHOWN = 8;

/** Left sidebar: organizations you follow (logo + name), "See all" when there are more. */
export async function FollowingSidebar({ userId }: { userId: string }) {
  const [orgs, total] = await Promise.all([getFollowedOrgs(userId, { limit: SHOWN }), countFollowedOrgs(userId)]);
  return (
    <SidebarSection title="Following" href={total > SHOWN ? "/following" : undefined}>
      {orgs.length === 0 ? (
        <SidebarEmpty>
          You don&apos;t follow any organizations yet.{" "}
          <Link href="/following" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Discover some
          </Link>
        </SidebarEmpty>
      ) : (
        <ul className="flex flex-col gap-1">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link
                href={`/nonprofits/${o.id}`}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:hover:bg-zinc-800"
              >
                <Logo name={o.name} imageId={o.logoImageId} size="size-8 text-sm" />
                <span className="truncate text-sm font-medium">{o.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SidebarSection>
  );
}
