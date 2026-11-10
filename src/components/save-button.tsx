"use client";

import { Bookmark } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleSaveAction } from "@/lib/engagement/actions";

/** Bookmark toggle. Flips at once and flips back if the server says no. */
export function SaveButton({ postId, saved }: { postId: string; saved: boolean }) {
  const [state, setState] = useState(saved);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const before = state;
    setState(!before);
    setError(undefined);
    startTransition(async () => {
      // A lost connection throws instead of returning an error: treat it the same.
      const result = await toggleSaveAction(postId).catch(() => ({ error: "Couldn't reach Bono. Check your connection and try again." }));
      if ("error" in result) {
        setState(before);
        setError(result.error);
      } else {
        setState(result.saved);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={state}
      title={error ?? (state ? "Remove from saved" : "Save for later")}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:focus:outline-white dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <Bookmark aria-hidden className={`size-5 ${state ? "fill-zinc-900 dark:fill-zinc-100 stroke-zinc-900 dark:stroke-zinc-100 dark:stroke-zinc-100" : ""}`} />
      <span>{state ? "Saved" : "Save"}</span>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </button>
  );
}
