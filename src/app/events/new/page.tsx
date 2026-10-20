import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { getNonprofitProfile } from "@/lib/profiles/queries";
import { EventForm } from "../event-form";

export const metadata = { title: "New event · Bono" };

export default function NewEventPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">New event</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <NewEvent />
      </Suspense>
    </main>
  );
}

async function NewEvent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "nonprofit") redirect("/events");
  const profile = await getNonprofitProfile(session.user.id);
  if (!profile) redirect("/onboarding");
  if (!profile.verifiedAt) redirect("/verify");
  const causes = profile.causes.map((c) => ({ value: c.slug, label: c.label }));
  return (
    <EventForm
      causes={causes}
      initial={{ title: "", description: "", locationType: "in_person", address: "", onlineUrl: "", capacity: "", causes: causes.map((c) => c.value) }}
    />
  );
}
