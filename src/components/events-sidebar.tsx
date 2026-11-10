import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { SidebarEmpty, SidebarSection } from "@/components/sidebar-section";
import { nextEventsFor } from "@/lib/events/queries";
import { imageUrl } from "@/lib/image-url";

/** Right sidebar: the next events you're interested in or going to. */
export async function EventsSidebar({ userId }: { userId: string }) {
  const list = await nextEventsFor(userId, 5);
  return (
    <SidebarSection title="Your upcoming events" href="/events" linkLabel="Events">
      {list.length === 0 ? (
        <SidebarEmpty>
          Mark events Interested or Going and they&apos;ll show here.{" "}
          <Link href="/events" className="font-medium text-zinc-900 dark:text-zinc-100 underline">
            Find events
          </Link>
        </SidebarEmpty>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.id}`} className="flex gap-3 rounded-lg p-1.5 hover:bg-zinc-100 focus:outline-2 focus:outline-zinc-900 dark:focus:outline-white dark:hover:bg-zinc-800">
                {e.coverImageId ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served from our own API
                  <img src={imageUrl(e.coverImageId)} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <CalendarDays className="size-6 text-zinc-500" />
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    <LocalTime iso={e.startsAt.toISOString()} />
                  </span>
                  <span className="text-sm font-semibold leading-snug">{e.title}</span>
                  <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                    {e.nonprofit.name} · {e.viewerStatus === "going" ? "Going" : "Interested"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SidebarSection>
  );
}
