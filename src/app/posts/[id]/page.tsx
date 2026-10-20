import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { PostList } from "@/components/post-list";
import { db } from "@/db";
import { nonprofitProfiles, posts } from "@/db/schema";
import { viewerLanguage } from "@/lib/ai/viewer-language";
import { getSession } from "@/lib/auth/session";
import { payPalClientId } from "@/lib/paypal/public-config";
import { nowMs } from "@/lib/matching/queries";
import { getPostsByIds } from "@/lib/posts/queries";

// One post on its own page: where "liked your post" notifications lead.

export default function PostPage({ params }: PageProps<"/posts/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Post params={params} />
      </Suspense>
    </main>
  );
}

async function Post({ params }: Pick<PageProps<"/posts/[id]">, "params">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const session = await getSession();
  const viewerId = session?.user.id ?? null;

  const [owner] = await db
    .select({ nonprofitId: posts.nonprofitId, name: nonprofitProfiles.name, verifiedAt: nonprofitProfiles.verifiedAt })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(eq(posts.id, id));
  // The safe-space rule: unverified nonprofits' posts are only visible to themselves.
  if (!owner || (!owner.verifiedAt && owner.nonprofitId !== viewerId)) notFound();

  const found = await getPostsByIds([id], viewerId);
  return (
    <>
      <title>{`Post by ${owner.name} · Bono`}</title>
      <Link href={`/nonprofits/${owner.nonprofitId}`} className="self-start text-sm font-medium text-emerald-700 underline dark:text-emerald-400">
        More from {owner.name}
      </Link>
      <PostList
        posts={found}
        fetchedAt={nowMs()}
        viewerId={viewerId}
        donateClientId={viewerId && viewerId !== owner.nonprofitId ? payPalClientId() : null}
        viewerLanguage={await viewerLanguage()}
        nextHref={null}
        openComments
        empty="This post was deleted."
      />
    </>
  );
}
