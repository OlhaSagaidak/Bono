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
}: {
  postId: string;
  body: string;
  language: string;
  viewerLanguage: string;
  canTranslate: boolean;
}) {
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
  return (
    <div className="flex flex-col gap-1">
      {/* lang lets screen readers pronounce the text in the right language. */}
      <p lang={shown ? viewerLanguage : language} className="whitespace-pre-line break-words">
        {shown ? translation : body}
      </p>
      {offerTranslation && (
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="font-medium text-emerald-700 hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-60 dark:text-emerald-400"
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
