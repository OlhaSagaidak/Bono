import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ProfileHeader } from "@/components/profile-header";
import { getSponsorProfile } from "@/lib/profiles/queries";

export default function SponsorPage({ params }: PageProps<"/sponsors/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <SponsorProfile params={params} />
      </Suspense>
    </main>
  );
}

async function SponsorProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await getSponsorProfile(id);
  if (!profile) notFound();

  return (
    <>
      <title>{`${profile.name} · Bono`}</title>
      <ProfileHeader name={profile.name} imageId={profile.logoImageId} kicker="Sponsor" />
      {profile.about && <p className="text-lg">{profile.about}</p>}
      {/* Active matching campaigns are listed here once campaigns exist (week 4). */}
    </>
  );
}
