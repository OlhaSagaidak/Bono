"use client";

import { useId, useState, useTransition } from "react";
import { whyAction } from "@/lib/ai/actions";

/** "Why am I seeing this?" — fetches a one-line reason on first click, then toggles it. */
export function WhyButton({ postId }: { postId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const panelId = useId();

  function toggle() {
    if (open) return setOpen(false);
    if (text) return setOpen(true);
    setError(undefined);
    startTransition(async () => {
      const result = await whyAction(postId);
      if ("error" in result) return setError(result.error);
      setText(result.text);
      setOpen(true);
    });
  }

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-expanded={open}
        aria-controls={panelId}
        className="text-zinc-600 underline-offset-2 hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-60 dark:text-zinc-400"
      >
        {pending ? "Checking…" : "Why am I seeing this?"}
      </button>
      {open && text && (
        <p id={panelId} className="mt-1 rounded-lg bg-zinc-100 px-3 py-2 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {text}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
