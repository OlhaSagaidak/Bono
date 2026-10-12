"use client";

import { useState, useTransition } from "react";
import { deletePostAction } from "@/lib/posts/actions";

const smallButton =
  "rounded-lg px-3 py-1 text-sm font-medium focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-60";

// Two steps instead of a browser confirm() dialog: nothing is deleted by a
// single stray tap, and focus stays on the post.
export function DeletePostButton({ postId }: { postId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // After Cancel, put keyboard focus back where it was instead of losing it.
  const [cancelled, setCancelled] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        autoFocus={cancelled}
        onClick={() => setConfirming(true)}
        className={`${smallButton} text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800`}
      >
        Delete
      </button>
    );
  }

  return (
    <div role="group" aria-label="Confirm delete" className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Delete this post for everyone?</span>
      <button
        type="button"
        autoFocus
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deletePostAction(postId);
            // On success the page re-renders without this post, so only errors need handling.
            if (result.error) setError(result.error);
          })
        }
        className={`${smallButton} bg-red-700 text-white hover:bg-red-800`}
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setConfirming(false);
          setCancelled(true);
        }}
        className={`${smallButton} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`}
      >
        Cancel
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
