"use client";

import { useState, useTransition } from "react";
import { toggleLikeAction } from "@/lib/engagement/actions";

/** Heart + count. Updates instantly, then settles on what the server says. */
export function LikeButton({ postId, liked, likes, disabled = false }: { postId: string; liked: boolean; likes: number; disabled?: boolean }) {
  const [state, setState] = useState({ liked, likes });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const before = state;
    setState({ liked: !before.liked, likes: before.likes + (before.liked ? -1 : 1) });
    setError(undefined);
    startTransition(async () => {
      // A lost connection throws instead of returning an error: treat it the same.
      const result = await toggleLikeAction(postId).catch(() => ({ error: "Couldn't reach Bono. Check your connection and try again." }));
      if ("error" in result) {
        setState(before);
        setError(result.error);
      } else {
        setState(result);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || pending}
      aria-pressed={state.liked}
      title={error}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:cursor-default disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <svg aria-hidden viewBox="0 0 24 24" className={`size-5 ${state.liked ? "fill-rose-600 stroke-rose-600" : "fill-none stroke-current"}`} strokeWidth="2">
        <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.9 5c2 0 3.4 1.1 5.1 3 1.7-1.9 3.1-3 5.1-3 3.6 0 5.7 3.6 4.4 6.8C19.5 16.4 12 21 12 21Z" />
      </svg>
      <span>
        {state.liked ? "Liked" : "Like"}
        {state.likes > 0 && <span className="text-zinc-500 dark:text-zinc-400"> · {state.likes}</span>}
      </span>
      {error && <span role="alert" className="sr-only">{error}</span>}
    </button>
  );
}
