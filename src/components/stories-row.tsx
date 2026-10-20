"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { StoryViewer } from "@/components/story-viewer";
import type { StoryOrg } from "@/lib/stories/queries";

/**
 * The row of story avatars above the feed. A green ring means unseen
 * stories; grey means you've seen them all. Opening one starts the
 * full-screen viewer, which then carries on to the next organization.
 */
export function StoriesRow({
  orgs: initial,
  canPost,
  openOrgId,
  donateClientId,
}: {
  orgs: StoryOrg[];
  /** Verified nonprofits get an "Add story" button. */
  canPost: boolean;
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

  if (orgs.length === 0 && !canPost) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        No stories right now. Stories from organizations you follow show here for 24 hours.
      </p>
    );
  }

  return (
    <section aria-label="Stories">
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {canPost && (
          <li className="shrink-0">
            <Link
              href="/stories/new"
              className="flex w-16 flex-col items-center gap-1 rounded-lg text-xs focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
            >
              <span className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-emerald-600 text-emerald-700 dark:text-emerald-400">
                <Plus aria-hidden className="size-6" />
              </span>
              <span className="w-full truncate text-center">Add story</span>
            </Link>
          </li>
        )}
        {orgs.map((org, i) => (
          <li key={org.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setOpenAt(i)}
              aria-label={`${org.own ? "Your stories" : `${org.name}'s stories`}${org.allSeen ? "" : ", new"}`}
              className="flex w-16 flex-col items-center gap-1 rounded-lg text-xs focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
            >
              <span
                className={`rounded-full p-0.5 ${org.allSeen ? "bg-zinc-300 dark:bg-zinc-700" : "bg-gradient-to-tr from-emerald-600 to-lime-400"}`}
              >
                <span className="block rounded-full bg-white p-0.5 dark:bg-zinc-950">
                  <Avatar name={org.name} imageId={org.logoImageId} className="size-12 text-lg" />
                </span>
              </span>
              <span className="w-full truncate text-center">{org.own ? "Your story" : org.name}</span>
            </button>
          </li>
        ))}
      </ul>
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
