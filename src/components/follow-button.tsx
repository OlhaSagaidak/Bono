"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/lib/engagement/actions";

export function FollowButton({
  nonprofitId,
  following,
  size = "small",
}: {
  nonprofitId: string;
  following: boolean;
  size?: "small" | "large";
}) {
  const [isFollowing, setFollowing] = useState(following);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const before = isFollowing;
    setFollowing(!before);
    setError(undefined);
    startTransition(async () => {
      const result = await toggleFollowAction(nonprofitId);
      if ("error" in result) {
        setFollowing(before);
        setError(result.error);
      } else {
        setFollowing(result.following);
      }
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
        isFollowing
          ? "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          : "border-emerald-700 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
      {error && <span role="alert" className="sr-only">{error}</span>}
    </button>
  );
}
