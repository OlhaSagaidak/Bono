import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EventCard } from "@/components/event-card";
import { getSession } from "@/lib/auth/session";
import { hostedEvents, myEvents, upcomingEvents } from "@/lib/events/queries";
import { getCauses } from "@/lib/profiles/queries";

export const metadata = { title: "Events · Bono" };

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading events…</p>}>
        <Events searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const tabClass =
  "rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 aria-[current=page]:bg-emerald-700 aria-[current=page]:text-white dark:hover:bg-zinc-800";
const chip =
  "rounded-full border border-zinc-300 px-3 py-1 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 aria-[current=page]:border-emerald-700 aria-[current=page]:bg-emerald-700 aria-[current=page]:text-white dark:border-zinc-700";

async function Events({ searchParams }: { searchParams: PageProps<"/events">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");
  const { id, role } = session.user;
  const { tab: tabParam, cause } = await searchParams;
  const tabs = [
    { key: "upcoming", label: "Upcoming" },
    { key: "mine", label: "My events" },
    ...(role === "nonprofit" ? [{ key: "hosting", label: "Hosting" }] : []),
  ];
  const tab = tabs.some((t) => t.key === tabParam) ? (tabParam as string) : "upcoming";
  const causes = await getCauses();
  const causeSlug = typeof cause === "string" && causes.some((c) => c.slug === cause) ? cause : undefined;

  const list = tab === "mine" ? await myEvents(id) : tab === "hosting" ? await hostedEvents(id, id) : await upcomingEvents(id, causeSlug);
  const empty =
    tab === "mine"
      ? "You haven't responded to any upcoming events yet."
      : tab === "hosting"
        ? "You haven't created any events yet."
        : causeSlug
          ? "No upcoming events in this cause."
          : "No upcoming events yet.";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Events</h1>
        {role === "nonprofit" && (
          <Link href="/events/new" className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600">
            New event
          </Link>
        )}
      </div>
      <nav aria-label="Event lists" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <Link key={t.key} href={t.key === "upcoming" ? "/events" : `/events?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={tabClass}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "upcoming" && (
        <nav aria-label="Filter by cause" className="flex flex-wrap gap-2">
          <Link href="/events" aria-current={!causeSlug ? "page" : undefined} className={chip}>
            All causes
          </Link>
          {causes.map((c) => (
            <Link key={c.slug} href={`/events?cause=${c.slug}`} aria-current={causeSlug === c.slug ? "page" : undefined} className={chip}>
              {c.label}
            </Link>
          ))}
        </nav>
      )}
      {tab === "upcoming" && !causeSlug && list.length > 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Organizations you follow come first.</p>
      )}
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </ul>
      )}
    </>
  );
}
