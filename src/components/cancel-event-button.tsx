"use client";

import { useState, useTransition } from "react";
import { cancelEventAction } from "@/lib/events/actions";

/** Two steps, like deleting a post: cancelling tells everyone who responded. */
export function CancelEventButton({ eventId }: { eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const base = "rounded-lg px-4 py-2 font-medium focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-60";

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={`${base} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`}>
        Cancel event
      </button>
    );
  }
  return (
    <div role="group" aria-label="Confirm cancelling" className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Cancel this event for everyone?</span>
      <button
        type="button"
        autoFocus
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelEventAction(eventId);
            if (result.error) setError(result.error);
          })
        }
        className={`${base} bg-red-700 text-white hover:bg-red-800`}
      >
        {pending ? "Cancelling…" : "Yes, cancel it"}
      </button>
      <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={`${base} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`}>
        Keep it
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
