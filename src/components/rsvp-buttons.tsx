"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { rsvpAction } from "@/lib/events/actions";

type Status = "interested" | "going" | null;

/** Interested / Going toggles; clicking the active one clears the response. */
export function RsvpButtons({ eventId, status, disabled = false }: { eventId: string; status: Status; disabled?: boolean }) {
  const [current, setOptimistic] = useOptimistic(status);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function choose(next: Status) {
    setError(undefined);
    startTransition(async () => {
      setOptimistic(next);
      const result = await rsvpAction(eventId, next);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  const button = (value: "interested" | "going", label: string) => {
    const active = current === value;
    return (
      <button
        type="button"
        aria-pressed={active}
        disabled={disabled || pending}
        onClick={() => choose(active ? null : value)}
        className={`rounded-lg border px-4 py-2 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-60 ${
          active
            ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
            : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        }`}
      >
        {active ? `✓ ${label}` : label}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Your response">
        {button("interested", "Interested")}
        {button("going", "Going")}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
