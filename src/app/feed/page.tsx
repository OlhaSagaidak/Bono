import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DwellTracker } from "@/components/dwell-tracker";
import { EventsSidebar } from "@/components/events-sidebar";
import { FollowingSidebar } from "@/components/following-sidebar";
import { PostList } from "@/components/post-list";
import { RecentChatsSidebar } from "@/components/recent-chats-sidebar";
import { SidebarEmpty, SidebarSection } from "@/components/sidebar-section";
import { getSession } from "@/lib/auth/session";
import { viewerLanguage } from "@/lib/ai/viewer-language";
import { payPalClientId } from "@/lib/paypal/public-config";
import { boostTerms } from "@/lib/boosts/config";
import { getRankedFeed } from "@/lib/feed/feed";

export const metadata = { title: "Feed · Bono" };

export default function FeedPage({ searchParams }: PageProps<"/feed">) {
  return (
    // Three columns on wide screens; below lg only the feed shows (the
    // sidebars' content is reachable from the top bar).
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[16rem_minmax(0,36rem)_17rem] lg:justify-center">
      <aside aria-label="Chats and following" className="hidden flex-col gap-4 lg:flex">
        <Suspense fallback={<SidebarSection title="Recent chats"><SidebarEmpty>Loading…</SidebarEmpty></SidebarSection>}>
          <RecentChatsSidebarForViewer />
        </Suspense>
        <Suspense fallback={<SidebarSection title="Following"><SidebarEmpty>Loading…</SidebarEmpty></SidebarSection>}>
          <FollowingSidebarForViewer />
        </Suspense>
      </aside>
      <main className="flex min-w-0 flex-col gap-6">
        <h1 className="text-2xl font-bold">Your feed</h1>
        <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading posts…</p>}>
          <Feed searchParams={searchParams} />
        </Suspense>
      </main>
      <aside aria-label="Your upcoming events" className="hidden flex-col gap-4 lg:flex">
        <Suspense fallback={<SidebarSection title="Your upcoming events"><SidebarEmpty>Loading…</SidebarEmpty></SidebarSection>}>
          <EventsSidebarForViewer />
        </Suspense>
      </aside>
    </div>
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
        boost={session.user.role === "sponsor" ? { ...boostTerms(), clientId: payPalClientId() } : null}
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

async function FollowingSidebarForViewer() {
  const session = await getSession();
  return session ? <FollowingSidebar userId={session.user.id} /> : null;
}

async function EventsSidebarForViewer() {
  const session = await getSession();
  return session ? <EventsSidebar userId={session.user.id} /> : null;
}

async function RecentChatsSidebarForViewer() {
  const session = await getSession();
  return session ? <RecentChatsSidebar userId={session.user.id} /> : null;
}
