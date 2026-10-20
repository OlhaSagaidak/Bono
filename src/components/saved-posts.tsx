import Link from "next/link";
import { PostList } from "@/components/post-list";
import { ReelThumbs } from "@/components/reel-thumbs";
import { viewerLanguage } from "@/lib/ai/viewer-language";
import { payPalClientId } from "@/lib/paypal/public-config";
import { getSavedPosts } from "@/lib/posts/queries";
import { getSavedReels } from "@/lib/reels/queries";

/** The owner's Saved tab: saved reels, then saved posts. Callers only render this for the profile's owner. */
export async function SavedPosts({ userId, basePath, before }: { userId: string; basePath: string; before?: string }) {
  const [{ posts, nextBefore, fetchedAt }, reels] = await Promise.all([getSavedPosts(userId, before), before ? [] : getSavedReels(userId)]);
  return (
    <section aria-labelledby="saved-heading" className="flex flex-col gap-4">
      <h2 id="saved-heading" className="text-xl font-semibold">
        Saved <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">(only you can see these)</span>
      </h2>
      {reels.length > 0 && (
        <section aria-labelledby="saved-reels-heading" className="flex flex-col gap-2">
          <h3 id="saved-reels-heading" className="font-semibold">
            Reels
          </h3>
          <ReelThumbs reels={reels} />
        </section>
      )}
      <h3 className="font-semibold">Posts</h3>
      <PostList
        posts={posts}
        fetchedAt={fetchedAt}
        viewerId={userId}
        donateClientId={payPalClientId()}
        viewerLanguage={await viewerLanguage()}
        nextHref={nextBefore && `${basePath}?tab=saved&before=${nextBefore}`}
        nextLabel="Older saves"
        empty={
          <>
            No saved posts yet. Tap <strong>Save</strong> on a post or a reel to keep it here.{" "}
            <Link href="/feed" className="font-medium text-emerald-700 underline dark:text-emerald-400">
              Go to your feed
            </Link>
          </>
        }
      />
    </section>
  );
}
