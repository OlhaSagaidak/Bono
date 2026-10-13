import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PostList } from "@/components/post-list";
import { ProfileHeader } from "@/components/profile-header";
import { DonateButton } from "@/components/donate-button";
import { getSession } from "@/lib/auth/session";
import { payPalClientId } from "@/lib/paypal/public-config";
import { getPosts } from "@/lib/posts/queries";
import { getNonprofitProfile } from "@/lib/profiles/queries";

export default function NonprofitPage({ params, searchParams }: PageProps<"/nonprofits/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <NonprofitProfile params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NonprofitProfile({
  params,
  searchParams,
}: Pick<PageProps<"/nonprofits/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [profile, session] = await Promise.all([getNonprofitProfile(id), getSession()]);
  if (!profile) notFound();
  const viewerId = session?.user.id ?? null;
  const isOwner = viewerId === id;
  // Unverified nonprofits are invisible to everyone else, as if they didn't exist yet.
  if (!profile.verifiedAt && !isOwner) notFound();

  const { before } = await searchParams;
  const cursor = z.uuid().safeParse(before);
  const { posts, nextBefore, fetchedAt } = await getPosts({
    nonprofitId: id,
    before: cursor.success ? cursor.data : undefined,
  });

  // Signed-in visitors may donate (never to their own organization); the
  // page is only visible to others once the nonprofit is verified.
  const donateClientId = viewerId && !isOwner ? payPalClientId() : null;

  // The PayPal payee email is deliberately not shown: it's only used server-side.
  return (
    <>
      <title>{`${profile.name} · Bono`}</title>
      {!profile.verifiedAt && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <strong>Only you can see this page for now.</strong> Bono shows supporters verified
          nonprofits only. Once your EIN is checked and the verification fee is paid, your page goes
          live and you can start posting.{" "}
          <Link href="/verify" className="font-semibold underline">
            Get verified
          </Link>
        </p>
      )}
      <ProfileHeader
        name={profile.name}
        imageId={profile.logoImageId}
        kicker="Nonprofit"
        verified={Boolean(profile.verifiedAt)}
      />
      <p className="text-lg">{profile.mission}</p>
      {donateClientId && (
        <div>
          <DonateButton nonprofitId={id} nonprofitName={profile.name} clientId={donateClientId} size="large" />
        </div>
      )}
      {!viewerId && (
        <p>
          <Link href="/login" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Log in to donate
          </Link>
        </p>
      )}
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
      <section aria-labelledby="posts-heading" className="flex flex-col gap-4">
        <h2 id="posts-heading" className="text-xl font-semibold">
          Posts
        </h2>
        <PostList
          posts={posts}
          fetchedAt={fetchedAt}
          viewerId={viewerId}
          donateClientId={donateClientId}
          nextHref={nextBefore && `/nonprofits/${id}?before=${nextBefore}`}
          nextLabel="Older posts"
          empty="No posts yet."
        />
      </section>
    </>
  );
}
