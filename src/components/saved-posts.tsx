import Link from "next/link";
import { PostList } from "@/components/post-list";
import { viewerLanguage } from "@/lib/ai/viewer-language";
import { payPalClientId } from "@/lib/paypal/public-config";
import { getSavedPosts } from "@/lib/posts/queries";

/** The owner's Saved tab. Callers only render this for the profile's owner. */
export async function SavedPosts({ userId, basePath, before }: { userId: string; basePath: string; before?: string }) {
  const { posts, nextBefore, fetchedAt } = await getSavedPosts(userId, before);
  return (
    <section aria-labelledby="saved-heading" className="flex flex-col gap-4">
      <h2 id="saved-heading" className="text-xl font-semibold">
        Saved posts <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">(only you can see these)</span>
      </h2>
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
            Nothing saved yet. Tap <strong>Save</strong> on a post to keep it here.{" "}
            <Link href="/feed" className="font-medium text-emerald-700 underline dark:text-emerald-400">
              Go to your feed
            </Link>
          </>
        }
      />
    </section>
  );
}
