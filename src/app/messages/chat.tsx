"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { TimeAgo } from "@/components/local-time";
import { sendMessageAction } from "@/lib/messages/actions";
import type { MessageView } from "@/lib/messages/queries";

const POLL_MS = 3_000;
const MAX = 2000;

type Shown = MessageView & { pending?: boolean };

/**
 * The open conversation. New messages arrive by polling every few seconds
 * while the tab is visible (no paid real-time service); your own appear
 * immediately and are replaced by the saved copy once the server confirms.
 */
export function Chat({
  conversationId,
  viewerId,
  otherName,
  initial,
  problem,
}: {
  conversationId: string;
  viewerId: string;
  otherName: string;
  initial: MessageView[];
  /** Why you can't send (blocked, unverified), or null. */
  problem: string | null;
}) {
  const [list, setList] = useState<Shown[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const lastSavedId = useRef(initial.at(-1)?.id);

  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const after = lastSavedId.current ? `?after=${lastSavedId.current}` : "";
      const res = await fetch(`/api/messages/${conversationId}${after}`, { cache: "no-store" });
      if (!res.ok) return;
      const { messages } = (await res.json()) as { messages: MessageView[] };
      if (messages.length > 0) {
        lastSavedId.current = messages.at(-1)!.id;
        // Skip any we already have (e.g. our own, added when the send returned).
        setList((all) => [...all, ...messages.filter((m) => !all.some((a) => a.id === m.id))]);
      }
      window.dispatchEvent(new Event("bono:badges"));
    } catch {
      // A missed poll is fine; the next one catches up.
    }
  }, [conversationId]);

  useEffect(() => {
    const soon = setTimeout(poll, 0); // marks the conversation read right away
    const timer = setInterval(poll, POLL_MS);
    return () => {
      clearTimeout(soon);
      clearInterval(timer);
    };
  }, [poll]);

  // Keep the newest message in view.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [list.length]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    const tempId = `pending-${Date.now()}`;
    setList((all) => [...all, { id: tempId, senderId: viewerId, body, createdAt: new Date().toISOString(), pending: true }]);
    setDraft("");
    setError(undefined);
    startTransition(async () => {
      const result = await sendMessageAction(conversationId, body);
      if ("error" in result) {
        // Put the text back so nothing is lost.
        setList((all) => all.filter((m) => m.id !== tempId));
        setDraft(body);
        setError(result.error);
        return;
      }
      setList((all) => {
        const rest = all.filter((m) => m.id !== tempId && m.id !== result.message.id);
        return [...rest, result.message];
      });
      lastSavedId.current = result.message.id;
    });
  }

  return (
    <>
      <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-4">
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
            No messages yet. Say hello to {otherName}.
          </p>
        ) : (
          <ol role="log" aria-label={`Messages with ${otherName}`} aria-live="polite" className="flex flex-col gap-2">
            {list.map((m) => {
              const mine = m.senderId === viewerId;
              return (
                <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <span className="sr-only">{mine ? "You:" : `${otherName}:`}</span>
                  <p
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-emerald-700 text-white" : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    } ${m.pending ? "opacity-70" : ""}`}
                  >
                    {m.body}
                  </p>
                  <span className="px-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                    {m.pending ? "Sending…" : <TimeAgo iso={m.createdAt} />}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {problem ? (
        <p className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">{problem}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex flex-col gap-1 border-t border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div className="flex items-end gap-2">
            <label htmlFor="message-draft" className="sr-only">
              Message {otherName}
            </label>
            <textarea
              id="message-draft"
              rows={1}
              value={draft}
              maxLength={MAX}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter starts a new line.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message…"
              aria-describedby={error ? "message-error" : undefined}
              className="max-h-40 min-h-10 flex-1 resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          {draft.length > MAX - 200 && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400" aria-live="polite">
              {MAX - draft.length} characters left
            </p>
          )}
          {error && (
            <p id="message-error" role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}
    </>
  );
}
