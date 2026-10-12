import Link from "next/link";
import { PostCard } from "@/components/post-card";
import type { FeedPost } from "@/lib/posts/queries";

export function PostList({
  posts,
  fetchedAt,
  nextHref,
  empty,
}: {
  posts: FeedPost[];
  fetchedAt: number;
  nextHref: string | null;
  empty: React.ReactNode;
}) {
  if (posts.length === 0) {
    return <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{empty}</div>;
  }
  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} now={fetchedAt} />
      ))}
      {nextHref && (
        <Link
          href={nextHref}
          className="self-center rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Older posts
        </Link>
      )}
    </div>
  );
}
