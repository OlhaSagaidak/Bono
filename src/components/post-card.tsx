import Link from "next/link";
import { BoostButton } from "@/components/boost-button";
import { DeletePostButton } from "@/components/delete-post-button";
import { DonateButton } from "@/components/donate-button";
import { FollowButton } from "@/components/follow-button";
import { LikeButton } from "@/components/like-button";
import { PostBody } from "@/components/post-body";
import { SaveButton } from "@/components/save-button";
import { WhyButton } from "@/components/why-button";
import { Logo } from "@/components/profile-header";
import { imageUrl } from "@/lib/images";
import type { FeedPost } from "@/lib/posts/queries";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const fullDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

// "5 minutes ago", "yesterday", then a plain date after a week.
// Rendered on the server per request, so `now` is the request time.
function timeAgo(date: Date, now: number) {
  const seconds = Math.round((date.getTime() - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
  ];
  let value = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return unit === "second" ? "just now" : relative.format(value, unit);
    value = Math.round(value / size);
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export function PostCard({
  post,
  now,
  canDelete,
  canEngage,
  donateClientId,
  viewerLanguage,
  canTranslate,
  showWhy,
  boost,
}: {
  post: FeedPost;
  now: number;
  canDelete: boolean;
  /** Signed in, and not this post's own nonprofit: may like and follow. */
  canEngage: boolean;
  /** PayPal client ID when the viewer may donate to this post's nonprofit, else null. */
  donateClientId: string | null;
  viewerLanguage: string;
  /** Signed in: translation calls Claude, so visitors don't get it. */
  canTranslate: boolean;
  /** In the ranked feed, offer "Why am I seeing this?". */
  showWhy: boolean;
  /** For sponsors: what a boost costs, and the PayPal client ID to pay with. */
  boost: { feeCents: number; days: number; clientId: string } | null;
}) {
  const profileHref = `/nonprofits/${post.nonprofit.id}`;
  return (
    <article data-post-id={post.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="flex items-center gap-3">
        <Link href={profileHref} tabIndex={-1} aria-hidden>
          <Logo name={post.nonprofit.name} imageId={post.nonprofit.logoImageId} size="size-10 text-base" />
        </Link>
        <div className="flex min-w-0 flex-col">
          <Link href={profileHref} className="truncate font-semibold hover:underline">
            {post.nonprofit.name}
          </Link>
          <time
            dateTime={post.createdAt.toISOString()}
            title={fullDate.format(post.createdAt)}
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            {timeAgo(post.createdAt, now)}
          </time>
        </div>
        {canEngage && (
          <div className="ml-auto">
            <FollowButton nonprofitId={post.nonprofit.id} following={post.viewerFollows} />
          </div>
        )}
      </header>

      {post.boostedBy.length > 0 && (
        // Paid placement is always labeled, at the top of the post.
        <p className="-mt-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Boosted by {post.boostedBy.join(" and ")}
        </p>
      )}

      <PostBody
        postId={post.id}
        body={post.body}
        language={post.language}
        viewerLanguage={viewerLanguage}
        canTranslate={canTranslate}
      />

      {post.imageId && (
        // eslint-disable-next-line @next/next/no-img-element -- served from our own API, no optimization needed
        <img
          src={imageUrl(post.imageId)}
          alt={post.imageAlt ?? ""}
          loading="lazy"
          className="max-h-[32rem] w-full rounded-xl object-cover"
        />
      )}

      {post.causes.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Causes">
          {post.causes.map((c) => (
            <li
              key={c.slug}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {c.label}
            </li>
          ))}
        </ul>
      )}

      {post.matchedBy && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <strong>{post.matchedBy.sponsorName}</strong> matches donations to {post.nonprofit.name}{" "}
          {post.matchedBy.ratioPercent / 100}:1 right now.
        </p>
      )}

      {showWhy && canEngage && <WhyButton postId={post.id} />}

      {(canDelete || canEngage || boost || post.likes > 0) && (
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <LikeButton postId={post.id} liked={post.likedByViewer} likes={post.likes} disabled={!canEngage} />
            {canEngage && <SaveButton postId={post.id} saved={post.savedByViewer} />}
            {donateClientId && (
              <DonateButton
                nonprofitId={post.nonprofit.id}
                nonprofitName={post.nonprofit.name}
                postId={post.id}
                clientId={donateClientId}
              />
            )}
          </div>
          {boost && (
            <BoostButton postId={post.id} nonprofitName={post.nonprofit.name} feeCents={boost.feeCents} days={boost.days} clientId={boost.clientId} />
          )}
          {canDelete && <DeletePostButton postId={post.id} />}
        </div>
      )}
    </article>
  );
}
