import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { imageUrl } from "@/lib/images";
import type { EventCard as EventCardData } from "@/lib/events/queries";

const RESPONSE = { interested: "Interested", going: "Going" } as const;

/** An event in a list: cover, date, title, organizer, counts and your response. */
export function EventCard({ event }: { event: EventCardData }) {
  const cancelled = event.status === "cancelled";
  return (
    <li>
      <Link
        href={`/events/${event.id}`}
        className="flex gap-3 rounded-2xl border border-zinc-200 p-3 hover:border-emerald-600 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-800"
      >
        {event.coverImageId ? (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own API
          <img src={imageUrl(event.coverImageId)} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
        ) : (
          <div aria-hidden className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <LocalTime iso={event.startsAt.toISOString()} format="date" />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm text-emerald-800 dark:text-emerald-300">
            <LocalTime iso={event.startsAt.toISOString()} />
          </span>
          <span className={`font-semibold ${cancelled ? "line-through" : ""}`}>{event.title}</span>
          <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
            {event.nonprofit.name} · {event.locationType === "online" ? "Online" : "In person"}
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {cancelled ? (
              <strong className="text-red-700 dark:text-red-400">Cancelled</strong>
            ) : (
              <>
                {event.going} going · {event.interested} interested
              </>
            )}
            {event.viewerStatus && !cancelled && <> · <strong className="text-zinc-900 dark:text-zinc-100">You: {RESPONSE[event.viewerStatus]}</strong></>}
          </span>
        </div>
      </Link>
    </li>
  );
}
