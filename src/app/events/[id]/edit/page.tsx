import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getEvent } from "@/lib/events/queries";
import { imageUrl } from "@/lib/images";
import { getNonprofitProfile } from "@/lib/profiles/queries";
import { EventForm } from "../../event-form";

export const metadata = { title: "Edit event · Bono" };

export default function EditEventPage({ params }: PageProps<"/events/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Edit event</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <EditEvent params={params} />
      </Suspense>
    </main>
  );
}

async function EditEvent({ params }: { params: PageProps<"/events/[id]/edit">["params"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const event = await getEvent(id, session.user.id);
  // Only the organizer edits; for anyone else it doesn't exist.
  if (!event || !event.isOrganizer) notFound();
  if (event.status === "cancelled") redirect(`/events/${id}`);
  const profile = await getNonprofitProfile(session.user.id);
  return (
    <EventForm
      causes={(profile?.causes ?? []).map((c) => ({ value: c.slug, label: c.label }))}
      initial={{
        id: event.id,
        title: event.title,
        description: event.description,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        locationType: event.locationType,
        address: event.address ?? "",
        onlineUrl: event.onlineUrl ?? "",
        capacity: event.capacity === null ? "" : String(event.capacity),
        causes: event.causes.map((c) => c.slug),
        coverUrl: event.coverImageId ? imageUrl(event.coverImageId) : undefined,
      }}
    />
  );
}
