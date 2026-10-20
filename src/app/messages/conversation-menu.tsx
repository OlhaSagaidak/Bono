"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reportAction, setBlockedAction } from "@/lib/messages/actions";

const button =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800";

/** Block / unblock and report, in the conversation's header. */
export function ConversationMenu({ conversationId, otherId, otherName, iBlocked }: { conversationId: string; otherId: string; otherName: string; iBlocked: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "block" | "report" | "reported">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string }>, next: typeof step) =>
    startTransition(async () => {
      const result = await action();
      if (result.error) return setError(result.error);
      setError(undefined);
      setStep(next);
      router.refresh();
    });

  if (step === "block") {
    return (
      <div role="group" aria-label={`Confirm blocking ${otherName}`} className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Block {otherName}? Neither of you will be able to send messages.</span>
        <button type="button" autoFocus disabled={pending} onClick={() => run(() => setBlockedAction(otherId, true), "idle")} className={`${button} border-red-700 bg-red-700 text-white hover:bg-red-800`}>
          Block
        </button>
        <button type="button" onClick={() => setStep("idle")} className={button}>
          Never mind
        </button>
        {error && <p role="alert" className="w-full text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>
    );
  }
  if (step === "report") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => reportAction(conversationId, reason), "reported");
        }}
        className="flex w-full flex-col gap-2"
      >
        <label htmlFor="report-reason" className="text-sm font-medium">
          What&apos;s wrong with this conversation?
        </label>
        <textarea
          id="report-reason"
          autoFocus
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={pending || !reason.trim()} className={button}>
            Send report
          </button>
          <button type="button" onClick={() => setStep("idle")} className={button}>
            Never mind
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {step === "reported" && (
        <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
          Thanks. Your report was saved for review.
        </p>
      )}
      {iBlocked ? (
        <button type="button" disabled={pending} onClick={() => run(() => setBlockedAction(otherId, false), "idle")} className={button}>
          Unblock
        </button>
      ) : (
        <button type="button" onClick={() => setStep("block")} className={button}>
          Block
        </button>
      )}
      {step !== "reported" && (
        <button type="button" onClick={() => setStep("report")} className={button}>
          Report
        </button>
      )}
    </div>
  );
}
