import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FollowButton } from "@/components/follow-button";
import { Logo } from "@/components/profile-header";
import { getSession } from "@/lib/auth/session";
import { discoverOrgs, getFollowedOrgs } from "@/lib/engagement/queries";
import { getCauses } from "@/lib/profiles/queries";

export const metadata = { title: "Following · Bono" };

export default function FollowingPage({ searchParams }: PageProps<"/following">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Following searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function OrgRow({ org, following }: { org: { id: string; name: string; logoImageId: string | null; mission: string }; following: boolean }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
      <Logo name={org.name} imageId={org.logoImageId} size="size-11 text-base" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/nonprofits/${org.id}`} className="truncate font-semibold hover:underline">
          {org.name}
        </Link>
        <span className="line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">{org.mission}</span>
      </div>
      <FollowButton nonprofitId={org.id} following={following} />
    </li>
  );
}

async function Following({ searchParams }: { searchParams: PageProps<"/following">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const { q, cause } = await searchParams;
  const search = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const causes = await getCauses();
  const causeSlug = typeof cause === "string" && causes.some((c) => c.slug === cause) ? cause : undefined;
  const [followed, discover] = await Promise.all([
    getFollowedOrgs(session.user.id, { search: search || undefined }),
    discoverOrgs(session.user.id, causeSlug),
  ]);

  const chip = "rounded-full border px-3 py-1 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600";
  return (
    <>
      <section aria-labelledby="following-heading" className="flex flex-col gap-4">
        <h1 id="following-heading" className="text-2xl font-bold">
          Following
        </h1>
        {/* A plain GET form: works without JavaScript and keeps the search in the URL. */}
        <form role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search organizations you follow
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Search organizations you follow"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {causeSlug && <input type="hidden" name="cause" value={causeSlug} />}
          <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Search
          </button>
        </form>
        {followed.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            {search ? `None of the organizations you follow match “${search}”.` : "You don't follow any organizations yet. Find some below."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {followed.map((o) => (
              <OrgRow key={o.id} org={o} following />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="discover-heading" className="flex flex-col gap-4">
        <h2 id="discover-heading" className="text-xl font-bold">
          Discover organizations
        </h2>
        <nav aria-label="Filter by cause" className="flex flex-wrap gap-2">
          <Link
            href={search ? `/following?q=${encodeURIComponent(search)}` : "/following"}
            aria-current={!causeSlug ? "page" : undefined}
            className={`${chip} border-zinc-300 aria-[current=page]:border-emerald-700 aria-[current=page]:bg-emerald-700 aria-[current=page]:text-white dark:border-zinc-700`}
          >
            All causes
          </Link>
          {causes.map((c) => (
            <Link
              key={c.slug}
              href={`/following?${new URLSearchParams({ ...(search && { q: search }), cause: c.slug })}`}
              aria-current={causeSlug === c.slug ? "page" : undefined}
              className={`${chip} border-zinc-300 aria-[current=page]:border-emerald-700 aria-[current=page]:bg-emerald-700 aria-[current=page]:text-white dark:border-zinc-700`}
            >
              {c.label}
            </Link>
          ))}
        </nav>
        {discover.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            {causeSlug ? "You already follow every verified organization in this cause." : "You already follow every verified organization."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {discover.map((o) => (
              <OrgRow key={o.id} org={o} following={false} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
