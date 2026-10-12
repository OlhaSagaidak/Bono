import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PostList } from "@/components/post-list";
import { ProfileHeader } from "@/components/profile-header";
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
  const profile = await getNonprofitProfile(id);
  if (!profile) notFound();

  const { before } = await searchParams;
  const cursor = z.uuid().safeParse(before);
  const { posts, nextBefore, fetchedAt } = await getPosts({
    nonprofitId: id,
    before: cursor.success ? cursor.data : undefined,
  });

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
      <section aria-labelledby="posts-heading" className="flex flex-col gap-4">
        <h2 id="posts-heading" className="text-xl font-semibold">
          Posts
        </h2>
        <PostList
          posts={posts}
          fetchedAt={fetchedAt}
          nextHref={nextBefore && `/nonprofits/${id}?before=${nextBefore}`}
          empty="No posts yet."
        />
      </section>
    </>
  );
}
