import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PostList } from "@/components/post-list";
import { getSession } from "@/lib/auth/session";
import { payPalClientId } from "@/lib/paypal/public-config";
import { getPosts } from "@/lib/posts/queries";

export const metadata = { title: "Feed · Bono" };

export default function FeedPage({ searchParams }: PageProps<"/feed">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Your feed</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading posts…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Feed({ searchParams }: { searchParams: PageProps<"/feed">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const { before } = await searchParams;
  // A malformed cursor just means "start from the newest".
  const cursor = z.uuid().safeParse(before);
  const { posts, nextBefore, fetchedAt } = await getPosts({ before: cursor.success ? cursor.data : undefined });

  return (
    <PostList
      posts={posts}
      fetchedAt={fetchedAt}
      viewerId={session.user.id}
      donateClientId={payPalClientId()}
      nextHref={nextBefore && `/feed?before=${nextBefore}`}
      empty={
        session.user.role === "nonprofit" ? (
          <>
            No posts yet.{" "}
            <Link href="/posts/new" className="font-medium text-emerald-700 underline dark:text-emerald-400">
              Write the first one
            </Link>
            .
          </>
        ) : (
          "No posts yet. Check back soon."
        )
      }
    />
  );
}
