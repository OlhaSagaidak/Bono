"use client";

import { useState, useTransition } from "react";
import { setShowBadgesAction } from "@/lib/profiles/actions";

/** "Show my badges": saved at once, and put back if the server refuses. */
export function BadgeSetting({ initial }: { initial: boolean }) {
  const [show, setShow] = useState(initial);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <section aria-labelledby="badge-setting-heading" className="flex flex-col gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <h2 id="badge-setting-heading" className="text-lg font-semibold">
        Badges
      </h2>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={show}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setShow(next);
            setMessage(undefined);
            startTransition(async () => {
              const result = await setShowBadgesAction(next).catch(() => ({ error: "Couldn't reach Bono. Please try again." }));
              if (result.error) {
                setShow(!next);
                setMessage(result.error);
              } else {
                setMessage(next ? "Your badges are visible." : "Your badges are hidden from others.");
              }
            });
          }}
          className="mt-1 size-4 accent-emerald-700"
        />
        <span>
          <span className="font-medium">Show my badges to others</span>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">
            On your profile, next to your comments, and on the nonprofits you support. Only the tier shows (like
            &quot;Emerging supporter&quot;), never amounts.
          </span>
        </span>
      </label>
      <p role="status" className="min-h-5 text-sm text-zinc-600 dark:text-zinc-400">
        {message}
      </p>
    </section>
  );
}
