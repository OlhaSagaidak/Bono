import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { SidebarEmpty, SidebarSection } from "@/components/sidebar-section";
import { nextEventsFor } from "@/lib/events/queries";

/** Right sidebar: the next events you're interested in or going to. */
export async function EventsSidebar({ userId }: { userId: string }) {
  const list = await nextEventsFor(userId, 5);
  return (
    <SidebarSection title="Your upcoming events" href="/events" linkLabel="Events">
      {list.length === 0 ? (
        <SidebarEmpty>
          Mark events Interested or Going and they&apos;ll show here.{" "}
          <Link href="/events" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Find events
          </Link>
        </SidebarEmpty>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.id}`} className="flex flex-col rounded-lg p-1.5 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:hover:bg-zinc-800">
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  <LocalTime iso={e.startsAt.toISOString()} />
                </span>
                <span className="text-sm font-semibold">{e.title}</span>
                <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                  {e.nonprofit.name} · {e.viewerStatus === "going" ? "Going" : "Interested"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SidebarSection>
  );
}
