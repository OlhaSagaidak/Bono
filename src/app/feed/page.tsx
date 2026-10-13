import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DwellTracker } from "@/components/dwell-tracker";
import { PostList } from "@/components/post-list";
import { getSession } from "@/lib/auth/session";
import { viewerLanguage } from "@/lib/ai/viewer-language";
import { payPalClientId } from "@/lib/paypal/public-config";
import { getRankedFeed } from "@/lib/feed/feed";

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

  const { page: pageParam } = await searchParams;
  // A missing or malformed page number just means the first page.
  const parsedPage = z.coerce.number().int().min(1).max(100).safeParse(pageParam);
  const page = parsedPage.success ? parsedPage.data : 1;
  const { posts, nextPage, fetchedAt, caughtUpAt } = await getRankedFeed(session.user, page);

  return (
    // Keyed by page so moving to the next page starts a fresh tracker.
    <DwellTracker key={page}>
      <PostList
        posts={posts}
        fetchedAt={fetchedAt}
        viewerId={session.user.id}
        donateClientId={payPalClientId()}
        viewerLanguage={await viewerLanguage()}
        nextHref={nextPage ? `/feed?page=${nextPage}` : null}
        caughtUpAt={caughtUpAt}
        showWhy
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
    </DwellTracker>
  );
}
