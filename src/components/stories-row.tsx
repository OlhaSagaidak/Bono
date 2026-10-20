"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { StoryViewer } from "@/components/story-viewer";
import { imageUrl } from "@/lib/image-url";
import type { StoryOrg } from "@/lib/stories/queries";

/**
 * The row of story cards above the feed: a preview of each organization's
 * next story, its photo with a green ring (unseen stories) or grey (all
 * seen), and its name. Opening one starts the full-screen viewer, which then carries on to the next organization.
 */
export function StoriesRow({
  orgs: initial,
  canPost,
  viewerPhotoId,
  openOrgId,
  donateClientId,
}: {
  orgs: StoryOrg[];
  /** Verified nonprofits get a "Create story" card. */
  canPost: boolean;
  /** Shown on the "Create story" card. */
  viewerPhotoId: string | null;
  /** Open this organization's stories right away (from a notification link). */
  openOrgId: string | null;
  donateClientId: string;
}) {
  // Stories seen since the page loaded, so rings turn grey without a reload.
  // The server's list stays the source of truth (it changes on refresh).
  const [seenNow, setSeenNow] = useState<ReadonlySet<string>>(new Set());
  const orgs = initial.map((o) => {
    const stories = o.stories.map((s) => (seenNow.has(s.id) ? { ...s, seen: true } : s));
    return { ...o, stories, allSeen: stories.every((s) => s.seen) };
  });
  const [openAt, setOpenAt] = useState<number | null>(() => {
    const i = initial.findIndex((o) => o.id === openOrgId);
    return i >= 0 ? i : null;
  });

  function markSeen(_orgIndex: number, storyId: string) {
    setSeenNow((seen) => new Set(seen).add(storyId));
  }

  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  // Arrows show only when there is more to scroll to on that side.
  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (el) setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  // Re-measure whenever the row (or its list of cards) changes size.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges]);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 3 * 124, behavior: "smooth" });

  if (orgs.length === 0 && !canPost) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        No stories right now. Stories from organizations you follow show here for 24 hours.
      </p>
    );
  }

  return (
    <section aria-label="Stories" className="relative">
      <ul ref={scroller} onScroll={updateEdges} className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {canPost && (
          <li className="shrink-0">
            <Link href="/stories/new" className={`${card} flex flex-col bg-white dark:bg-zinc-900`}>
              <span className="relative block h-[70%] overflow-hidden">
                {viewerPhotoId ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served from our own API
                  <img src={imageUrl(viewerPhotoId)} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <span className="block size-full bg-emerald-100 dark:bg-emerald-950" />
                )}
              </span>
              <span className="relative flex flex-1 items-end justify-center pb-2 text-xs font-semibold">
                <span className="absolute -top-5 flex size-10 items-center justify-center rounded-full border-4 border-white bg-emerald-700 text-white dark:border-zinc-900">
                  <Plus aria-hidden className="size-5" />
                </span>
                Create story
              </span>
            </Link>
          </li>
        )}
        {orgs.map((org, i) => {
          // Preview the story the viewer would open at: the first unseen one.
          const preview = org.stories.find((s) => !s.seen) ?? org.stories.at(-1)!;
          return (
            <li key={org.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setOpenAt(i)}
                aria-label={`${org.own ? "Your stories" : `${org.name}'s stories`}${org.allSeen ? "" : ", new"}`}
                className={`${card} bg-zinc-800`}
              >
                {preview.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served from our own API
                  <img src={preview.src} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  // "#t=0.1" shows a frame instead of a black box, without playing.
                  <video src={`${preview.src}#t=0.1`} muted playsInline preload="metadata" aria-hidden className="pointer-events-none size-full object-cover" />
                )}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/70" />
                <span
                  className={`absolute left-2 top-2 rounded-full p-0.5 ${org.allSeen ? "bg-zinc-300" : "bg-gradient-to-tr from-emerald-500 to-lime-300"}`}
                >
                  <span className="block rounded-full bg-zinc-900 p-0.5">
                    <Avatar name={org.name} imageId={org.logoImageId} className="size-8 text-sm" />
                  </span>
                </span>
                <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-left text-xs font-semibold leading-tight text-white">
                  {org.own ? "Your story" : org.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!edges.start && (
        <button type="button" onClick={() => scrollBy(-1)} aria-label="Earlier stories" className={`${arrow} left-1`}>
          <ChevronLeft aria-hidden className="size-5" />
        </button>
      )}
      {!edges.end && (
        <button type="button" onClick={() => scrollBy(1)} aria-label="More stories" className={`${arrow} right-1`}>
          <ChevronRight aria-hidden className="size-5" />
        </button>
      )}
      {openAt !== null && orgs[openAt] && (
        <StoryViewer
          orgs={orgs}
          startAt={openAt}
          onSeen={markSeen}
          onClose={() => setOpenAt(null)}
          donateClientId={donateClientId}
        />
      )}
    </section>
  );
}

const card =
  "group relative block h-48 w-28 overflow-hidden rounded-xl border border-zinc-200 shadow-sm focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-800";
const arrow =
  "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:bg-zinc-800 dark:text-zinc-100";
