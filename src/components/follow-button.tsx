"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toggleFollowAction } from "@/lib/engagement/actions";

/**
 * Follow / Following. The click shows the new state at once (useOptimistic);
 * the refreshed server data then takes over, so every card for this nonprofit
 * and the Following sidebar agree. On failure it falls back by itself.
 */
export function FollowButton({
  nonprofitId,
  following,
  size = "small",
}: {
  nonprofitId: string;
  following: boolean;
  size?: "small" | "large";
}) {
  const [isFollowing, setOptimistic] = useOptimistic(following);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    setError(undefined);
    startTransition(async () => {
      setOptimistic(!isFollowing);
      const result = await toggleFollowAction(nonprofitId);
      if ("error" in result) setError(result.error);
      router.refresh();
    });
  }

  const sizing = size === "large" ? "px-4 py-2 font-semibold" : "px-3 py-0.5 text-sm font-medium";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFollowing}
      title={error}
      className={`${sizing} rounded-lg border focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 ${
        // Not following: a filled green call to action. Following: a quiet white button.
        isFollowing
          ? "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          : "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
      {error && <span role="alert" className="sr-only">{error}</span>}
    </button>
  );
}
