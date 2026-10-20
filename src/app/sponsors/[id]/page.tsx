import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { MessageButton } from "@/components/message-button";
import { PoolMeter } from "@/components/pool-meter";
import { ProfileTabs } from "@/components/profile-tabs";
import { SavedPosts } from "@/components/saved-posts";
import { ProfileHeader } from "@/components/profile-header";
import { formatCents } from "@/lib/donations/amounts";
import { getSession } from "@/lib/auth/session";
import { getSponsorCampaigns } from "@/lib/matching/queries";
import { getSponsorProfile } from "@/lib/profiles/queries";

export default function SponsorPage({ params, searchParams }: PageProps<"/sponsors/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <SponsorProfile params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SponsorProfile({ params, searchParams }: Pick<PageProps<"/sponsors/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [profile, session] = await Promise.all([getSponsorProfile(id), getSession()]);
  if (!profile) notFound();
  const isOwner = session?.user.id === id;
  const canMessage = session && !isOwner;
  const { tab, before } = await searchParams;
  const savedTab = isOwner && tab === "saved";
  const cursor = z.uuid().safeParse(before);

  return (
    <>
      <title>{`${profile.name} · Bono`}</title>
      <ProfileHeader name={profile.name} imageId={profile.logoImageId} kicker="Sponsor" />
      {profile.bio && <p className="text-lg">{profile.bio}</p>}
      {canMessage && (
        <div className="flex">
          <MessageButton userId={id} size="large" />
        </div>
      )}
      {isOwner && <ProfileTabs basePath={`/sponsors/${id}`} first="Campaigns" savedActive={savedTab} />}
      {savedTab ? (
        <SavedPosts userId={id} basePath={`/sponsors/${id}`} before={cursor.success ? cursor.data : undefined} />
      ) : (
        <ActiveCampaigns sponsorId={id} />
      )}
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
