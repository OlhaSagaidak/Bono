import { Fragment } from "react";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import type { FeedPost } from "@/lib/posts/queries";

export function PostList({
  posts,
  fetchedAt,
  viewerId,
  donateClientId,
  viewerLanguage,
  nextHref,
  nextLabel = "More posts",
  caughtUpAt = null,
  showWhy = false,
  empty,
}: {
  posts: FeedPost[];
  fetchedAt: number;
  /** The signed-in account, if any: its own posts get a Delete button. */
  viewerId: string | null;
  /** PayPal client ID if the viewer is signed in (and so may donate), else null. */
  donateClientId: string | null;
  viewerLanguage: string;
  nextHref: string | null;
  nextLabel?: string;
  /** Index of the first already-seen post, to put "You're all caught up" before it. */
  caughtUpAt?: number | null;
  /** Ranked feed only: "Why am I seeing this?" on each post. */
  showWhy?: boolean;
  empty: React.ReactNode;
}) {
  if (posts.length === 0) {
    return <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{empty}</div>;
  }
  return (
    <div className="flex flex-col gap-4">
      {posts.map((post, i) => (
        <Fragment key={post.id}>
          {i === caughtUpAt && (
            <p className="flex items-center gap-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              You&apos;re all caught up. Posts you&apos;ve seen:
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </p>
          )}
          <PostCard
            post={post}
            now={fetchedAt}
            canDelete={post.nonprofit.id === viewerId}
            canEngage={viewerId !== null && post.nonprofit.id !== viewerId}
            // Anyone signed in may donate, except to their own organization.
            donateClientId={post.nonprofit.id === viewerId ? null : donateClientId}
            viewerLanguage={viewerLanguage}
            canTranslate={viewerId !== null}
            showWhy={showWhy}
          />
        </Fragment>
      ))}
      {nextHref && (
        <Link
          href={nextHref}
          className="self-center rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {nextLabel}
        </Link>
      )}
    </div>
  );
}
