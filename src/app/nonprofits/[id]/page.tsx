import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ProfileHeader } from "@/components/profile-header";
import { getNonprofitProfile } from "@/lib/profiles/queries";

export default function NonprofitPage({ params }: PageProps<"/nonprofits/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <NonprofitProfile params={params} />
      </Suspense>
    </main>
  );
}

async function NonprofitProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await getNonprofitProfile(id);
  if (!profile) notFound();

  // The PayPal payee email is deliberately not shown: it's only used server-side.
  return (
    <>
      <title>{`${profile.name} · Bono`}</title>
      <ProfileHeader name={profile.name} imageId={profile.logoImageId} kicker="Nonprofit" />
      <p className="text-lg">{profile.mission}</p>
      <ul className="flex flex-wrap gap-2" aria-label="Causes">
        {profile.causes.map((c) => (
          <li
            key={c.slug}
            className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {c.label}
          </li>
        ))}
      </ul>
    </>
  );
}
