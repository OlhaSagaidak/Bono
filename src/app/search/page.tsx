import { CalendarDays, Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { LocalTime } from "@/components/local-time";
import { imageUrl } from "@/lib/images";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PostList } from "@/components/post-list";
import { Logo } from "@/components/profile-header";
import { viewerLanguage } from "@/lib/ai/viewer-language";
import { getSession } from "@/lib/auth/session";
import { payPalClientId } from "@/lib/paypal/public-config";
import { QUERY_MAX, searchEvents, searchOrganizations, searchPeople, searchPosts } from "@/lib/search/queries";

export const metadata = { title: "Search · Bono" };

const SUGGESTIONS = ["rescue dogs", "help for refugee families", "tree planting", "free meals", "mentoring teens"];

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Search</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Searching…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, QUERY_MAX);

  const form = (
    <form action="/search" role="search" className="flex gap-2">
      <label htmlFor="q" className="sr-only">
        Search nonprofits, people, events and posts
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={QUERY_MAX}
        autoFocus={!q}
        placeholder="Search nonprofits, people, events and posts"
        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-2 focus:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:outline-white"
      />
      <button
        type="submit"
        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 font-semibold text-white hover:bg-zinc-700 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:outline-white"
      >
        <Search aria-hidden className="size-4" />
        Search
      </button>
    </form>
  );

  if (!q) {
    return (
      <>
        {form}
        <p className="text-zinc-600 dark:text-zinc-400">
          Search nonprofits, people, events and posts by name, cause or what you care about. Bono understands meaning, not just words: try one of these.
        </p>
        <ul className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <Link
                href={`/search?q=${encodeURIComponent(s)}`}
                className="block rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 focus:outline-2 focus:outline-zinc-900 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus:outline-white"
              >
                {s}
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const { posts, fetchedAt } = await searchPosts(q, session.user.id);
  // The organizations behind the matching posts, the one with the most matches first.
  const counts = new Map<string, number>();
  for (const p of posts) counts.set(p.nonprofit.id, (counts.get(p.nonprofit.id) ?? 0) + 1);
  const [orgs, people, events] = await Promise.all([
    searchOrganizations(q, [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)),
    searchPeople(q),
    searchEvents(q),
  ]);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const found = [
    orgs.length && plural(orgs.length, "organization", "organizations"),
    people.length && plural(people.length, "person", "people"),
    events.length && plural(events.length, "event", "events"),
    posts.length && plural(posts.length, "post", "posts"),
  ].filter(Boolean);
  return (
    <>
      {form}
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
        {found.length === 0
          ? `Nothing found for "${q}". Try other words, or a cause like "animals" or "climate".`
          : `${found.join(", ")} for "${q}"`}
      </p>
      {orgs.length > 0 && (
        <section aria-labelledby="orgs-heading" className="flex flex-col gap-3">
          <h2 id="orgs-heading" className="text-lg font-semibold">
            Organizations
          </h2>
          <ul className="flex flex-col gap-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/nonprofits/${o.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 hover:bg-zinc-50 focus:outline-2 focus:outline-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:focus:outline-white"
                >
                  <Logo name={o.name} imageId={o.logoImageId} size="size-11 text-base" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">
                      {o.name}
                      {!o.verified && <span className="ml-2 text-xs font-normal text-zinc-600 dark:text-zinc-400">Not verified yet</span>}
                    </span>
                    <span className="line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">{o.mission}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {people.length > 0 && (
        <section aria-labelledby="people-heading" className="flex flex-col gap-3">
          <h2 id="people-heading" className="text-lg font-semibold">
            People
          </h2>
          <ul className="flex flex-col gap-2">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={p.role === "sponsor" ? `/sponsors/${p.id}` : `/users/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 hover:bg-zinc-50 focus:outline-2 focus:outline-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:focus:outline-white"
                >
                  <Avatar name={p.name} imageId={p.imageId} className="size-11" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">
                      {p.name}
                      <span className="ml-2 text-xs font-normal text-zinc-600 dark:text-zinc-400">{p.role === "sponsor" ? "Sponsor" : "Supporter"}</span>
                    </span>
                    {p.bio && <span className="line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">{p.bio}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {events.length > 0 && (
        <section aria-labelledby="events-heading" className="flex flex-col gap-3">
          <h2 id="events-heading" className="text-lg font-semibold">
            Events
          </h2>
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 hover:bg-zinc-50 focus:outline-2 focus:outline-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:focus:outline-white"
                >
                  {e.coverImageId ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served from our own API
                    <img src={imageUrl(e.coverImageId)} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <CalendarDays aria-hidden className="size-6" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">
                      {e.title}
                      {e.cancelled && <span className="ml-2 text-xs font-normal text-zinc-600 dark:text-zinc-400">Cancelled</span>}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      <LocalTime iso={e.startsAt.toISOString()} /> · {e.nonprofitName}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {posts.length > 0 && (
        <section aria-labelledby="posts-heading" className="flex flex-col gap-3">
          <h2 id="posts-heading" className="text-lg font-semibold">
            Posts
          </h2>
          <PostList
            posts={posts}
            fetchedAt={fetchedAt}
            viewerId={session.user.id}
            donateClientId={payPalClientId()}
            viewerLanguage={await viewerLanguage()}
            nextHref={null}
            empty={null}
          />
        </section>
      )}
    </>
  );
}
