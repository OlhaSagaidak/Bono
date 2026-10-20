import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { CancelEventButton } from "@/components/cancel-event-button";
import { DonateButton } from "@/components/donate-button";
import { LocalTimeRange } from "@/components/local-time";
import { Logo } from "@/components/profile-header";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { getSession } from "@/lib/auth/session";
import { getEvent } from "@/lib/events/queries";
import { imageUrl } from "@/lib/images";
import { payPalClientId } from "@/lib/paypal/public-config";

export const metadata = { title: "Event · Bono" };

export default function EventPage({ params }: PageProps<"/events/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <Link href="/events" className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400">
        ← Events
      </Link>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Event params={params} />
      </Suspense>
    </main>
  );
}

async function Event({ params }: { params: PageProps<"/events/[id]">["params"] }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const session = await getSession();
  const viewerId = session?.user.id ?? null;
  const e = await getEvent(id, viewerId);
  // Unverified organizers' events don't exist for anyone else (safe space).
  if (!e || (!e.verified && !e.isOrganizer)) notFound();

  const cancelled = e.status === "cancelled";
  const over = e.endsAt.getTime() < nowMs();
  const full = e.capacity !== null && e.going >= e.capacity;

  return (
    <>
      <title>{`${e.title} · Bono`}</title>
      {e.coverImageId && (
        // eslint-disable-next-line @next/next/no-img-element -- served from our own API
        <img src={imageUrl(e.coverImageId)} alt="" className="max-h-80 w-full rounded-2xl object-cover" />
      )}
      {cancelled && (
        <p role="status" className="rounded-lg bg-red-50 px-4 py-3 font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
          This event was cancelled.
        </p>
      )}
      <div className="flex flex-col gap-1">
        <p className="font-medium text-emerald-800 dark:text-emerald-300">
          <LocalTimeRange startIso={e.startsAt.toISOString()} endIso={e.endsAt.toISOString()} />
        </p>
        <h1 className={`text-2xl font-bold ${cancelled ? "line-through" : ""}`}>{e.title}</h1>
        <Link href={`/nonprofits/${e.nonprofit.id}`} className="flex items-center gap-2 self-start hover:underline">
          <Logo name={e.nonprofit.name} imageId={e.nonprofit.logoImageId} size="size-7 text-sm" />
          <span className="font-medium">{e.nonprofit.name}</span>
        </Link>
      </div>

      <p className="text-zinc-700 dark:text-zinc-300">
        {e.locationType === "online" ? (
          <>
            Online:{" "}
            {e.onlineUrl && (
              <a href={e.onlineUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 underline dark:text-emerald-400">
                join link
              </a>
            )}
          </>
        ) : (
          <>In person: {e.address}</>
        )}
      </p>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <strong className="text-zinc-900 dark:text-zinc-100">{e.going}</strong> going{e.capacity !== null && ` of ${e.capacity}`} ·{" "}
        <strong className="text-zinc-900 dark:text-zinc-100">{e.interested}</strong> interested
        {full && !cancelled && " · Full"}
      </p>

      <div className="flex flex-wrap items-start gap-3">
        {viewerId && !e.isOrganizer && !over && (cancelled ? e.viewerStatus !== null : true) && (
          <RsvpButtons eventId={e.id} status={e.viewerStatus} disabled={cancelled} />
        )}
        {!viewerId && (
          <Link href="/login" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Log in to respond
          </Link>
        )}
        {viewerId && !e.isOrganizer && e.verified && (
          <DonateButton nonprofitId={e.nonprofit.id} nonprofitName={e.nonprofit.name} clientId={payPalClientId()} size="large" />
        )}
        {e.isOrganizer && !cancelled && (
          <>
            <Link href={`/events/${e.id}/edit`} className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Edit
            </Link>
            <CancelEventButton eventId={e.id} />
          </>
        )}
      </div>
      {over && !cancelled && <p className="text-sm text-zinc-600 dark:text-zinc-400">This event is over.</p>}

      <p className="whitespace-pre-line">{e.description}</p>
      {e.causes.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Causes">
          {e.causes.map((c) => (
            <li key={c.slug} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {c.label}
            </li>
          ))}
        </ul>
      )}

      {e.attendees && (
        <section aria-labelledby="attendees-heading" className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 id="attendees-heading" className="font-semibold">
            Who&apos;s coming <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">(only you see this)</span>
          </h2>
          {(["going", "interested"] as const).map((status) => {
            const people = e.attendees!.filter((a) => a.status === status);
            return (
              <div key={status}>
                <h3 className="text-sm font-medium">
                  {status === "going" ? "Going" : "Interested"} ({people.length})
                </h3>
                {people.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Nobody yet.</p>
                ) : (
                  <ul className="text-sm">
                    {people.map((p) => (
                      <li key={p.id}>
                        {p.role === "user" ? (
                          <Link href={`/users/${p.id}`} className="hover:underline">
                            {p.name}
                          </Link>
                        ) : (
                          p.name
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

const nowMs = () => Date.now();
