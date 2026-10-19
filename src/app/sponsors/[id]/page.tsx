import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PoolMeter } from "@/components/pool-meter";
import { ProfileHeader } from "@/components/profile-header";
import { formatCents } from "@/lib/donations/amounts";
import { getSponsorCampaigns } from "@/lib/matching/queries";
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
      {profile.bio && <p className="text-lg">{profile.bio}</p>}
      <ActiveCampaigns sponsorId={id} />
    </>
  );
}

async function ActiveCampaigns({ sponsorId }: { sponsorId: string }) {
  const active = (await getSponsorCampaigns(sponsorId)).filter((c) => c.state === "active");
  if (active.length === 0) return null;
  return (
    <section aria-labelledby="campaigns-heading" className="flex flex-col gap-3">
      <h2 id="campaigns-heading" className="text-xl font-semibold">
        Matching right now
      </h2>
      <ul className="flex flex-col gap-3">
        {active.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="font-semibold">{c.name}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {c.ratioPercent / 100}:1 on donations to {c.causeLabel ? `${c.causeLabel.toLowerCase()} nonprofits` : `${c.nonprofitCount} nonprofits`},
              up to {formatCents(c.capCents)} each
            </span>
            <PoolMeter usedCents={c.reservedCents} poolCents={c.poolCents} />
          </li>
        ))}
      </ul>
    </section>
  );
}
