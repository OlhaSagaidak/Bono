"use client";

import { useState, useTransition } from "react";
import { translatePostAction } from "@/lib/ai/actions";

const LANGUAGE_NAMES: Record<string, string> = { en: "English", es: "Spanish", uk: "Ukrainian" };

/** A post's text, with a Translate / Show original toggle when it's in another language. */
export function PostBody({
  postId,
  body,
  language,
  viewerLanguage,
  canTranslate,
  collapsible = true,
}: {
  postId: string;
  body: string;
  language: string;
  viewerLanguage: string;
  canTranslate: boolean;
  /** In a feed, long posts start collapsed to a few lines with "See more". */
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const offerTranslation = canTranslate && language !== viewerLanguage;

  function toggle() {
    if (showTranslation) return setShowTranslation(false);
    if (translation) return setShowTranslation(true);
    setError(undefined);
    startTransition(async () => {
      const result = await translatePostAction(postId, viewerLanguage);
      if ("error" in result) return setError(result.error);
      setTranslation(result.text);
      setShowTranslation(true);
    });
  }

  const shown = showTranslation && translation;
  // Long enough to run past five lines on a phone.
  const collapsed = collapsible && !expanded && (shown ? translation : body).length > 280;
  return (
    <div className="flex flex-col gap-1">
      {/* lang lets screen readers pronounce the text in the right language. */}
      <p
        id={`post-body-${postId}`}
        lang={shown ? viewerLanguage : language}
        className={`whitespace-pre-line break-words ${collapsed ? "line-clamp-5" : ""}`}
      >
        {shown ? translation : body}
      </p>
      {collapsed && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          aria-controls={`post-body-${postId}`}
          className="self-start font-medium text-zinc-600 hover:text-zinc-900 focus:outline-2 focus:outline-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus:outline-white"
        >
          See more
        </button>
      )}
      {offerTranslation && (
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:focus:outline-white disabled:opacity-60"
          >
            {pending
              ? "Translating…"
              : shown
                ? "Show original"
                : `Translate to ${LANGUAGE_NAMES[viewerLanguage] ?? viewerLanguage}`}
          </button>
          {shown && (
            <span className="text-zinc-600 dark:text-zinc-400">
              Translated from {LANGUAGE_NAMES[language] ?? language} by AI
            </span>
          )}
          {error && (
            <span role="alert" className="text-red-700 dark:text-red-400">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
