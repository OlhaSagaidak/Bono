"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { BackerBadge } from "@/components/backer-badge";
import { TimeAgo } from "@/components/local-time";
import type { Reaction } from "@/db/schema";
import {
  addCommentAction,
  deleteCommentAction,
  editCommentAction,
  reactToCommentAction,
  reportCommentAction,
  translateCommentAction,
} from "@/lib/comments/actions";
import type { CommentView } from "@/lib/comments/queries";
import { COMMENT_MAX, REACTIONS } from "@/lib/comments/reactions";

const OFFLINE = { error: "Couldn't reach Bono. Check your connection and try again." };
const byKey = Object.fromEntries(REACTIONS.map((r) => [r.key, r]));

/**
 * A post's action row plus its comments. The row (Like, Save, Donate...) is
 * passed in from the server-rendered card; this adds the Comment button and,
 * once opened, the comments: loaded on demand, oldest first, with replies
 * one level deep under each comment.
 */
export function PostActions({
  postId,
  count,
  signedIn,
  initiallyOpen = false,
  viewerLanguage,
  left,
  right,
}: {
  postId: string;
  count: number;
  /** Visitors see the count but need to log in to read and write comments. */
  signedIn: boolean;
  initiallyOpen?: boolean;
  /** Comments in other languages get "See translation". */
  viewerLanguage: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const shownCount = comments?.length ?? count;
  const sectionId = useId();

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setComments((await res.json()).comments);
    } catch {
      setLoadError(true);
    }
  }, [postId]);

  // Opened from the start (a post's own page): load right after mounting.
  useEffect(() => {
    if (!initiallyOpen || !signedIn) return;
    const soon = setTimeout(load, 0);
    return () => clearTimeout(soon);
  }, [initiallyOpen, signedIn, load]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          {left}
          {signedIn ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={sectionId}
              onClick={() => {
                if (!open && comments === null) void load();
                setOpen(!open);
              }}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <MessageCircle aria-hidden className="size-5" />
              Comment{shownCount > 0 && <span className="text-zinc-500 dark:text-zinc-400"> · {shownCount}</span>}
            </button>
          ) : (
            shownCount > 0 && (
              <span className="px-2 text-sm text-zinc-600 dark:text-zinc-400">
                {shownCount} {shownCount === 1 ? "comment" : "comments"}
              </span>
            )
          )}
        </div>
        {right}
      </div>
      {open && (
        <section id={sectionId} aria-label="Comments" className="flex flex-col gap-3">
          {loadError ? (
            <p role="alert" className="text-sm text-zinc-600 dark:text-zinc-400">
              Couldn&apos;t load the comments.{" "}
              <button type="button" onClick={load} className="font-medium text-emerald-700 underline dark:text-emerald-400">
                Try again
              </button>
            </p>
          ) : comments === null ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading comments…</p>
          ) : (
            <Thread postId={postId} comments={comments} viewerLanguage={viewerLanguage} onChange={setComments} />
          )}
        </section>
      )}
    </>
  );
}

function Thread({
  postId,
  comments,
  viewerLanguage,
  onChange,
}: {
  postId: string;
  comments: CommentView[];
  viewerLanguage: string;
  onChange: (c: CommentView[]) => void;
}) {
  const top = comments.filter((c) => !c.parentId);
  const update = (id: string, patch: Partial<CommentView>) => onChange(comments.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  // Deleting a comment removes its replies too (the database does the same).
  const remove = (id: string) => onChange(comments.filter((c) => c.id !== id && c.parentId !== id));

  return (
    <>
      {top.length === 0 && <p className="text-sm text-zinc-600 dark:text-zinc-400">No comments yet. Be the first.</p>}
      {top.length > 0 && (
        <ul className="flex flex-col gap-3">
          {top.map((c) => (
            <TopComment
              key={c.id}
              postId={postId}
              comment={c}
              replies={comments.filter((r) => r.parentId === c.id)}
              viewerLanguage={viewerLanguage}
              onUpdate={update}
              onRemove={remove}
              onReplaced={onChange}
            />
          ))}
        </ul>
      )}
      <Composer postId={postId} parentId={null} placeholder="Write a comment…" onPosted={onChange} />
    </>
  );
}

function TopComment({
  postId,
  comment,
  replies,
  viewerLanguage,
  onUpdate,
  onRemove,
  onReplaced,
}: {
  postId: string;
  comment: CommentView;
  replies: CommentView[];
  viewerLanguage: string;
  onUpdate: (id: string, patch: Partial<CommentView>) => void;
  onRemove: (id: string) => void;
  onReplaced: (all: CommentView[]) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null); // name to start the reply with

  const startReply = (name: string) => {
    setShowReplies(true);
    setReplyTo(name);
  };

  return (
    <li className="flex flex-col gap-2">
      <Comment comment={comment} viewerLanguage={viewerLanguage} onReply={() => startReply("")} onUpdate={onUpdate} onRemove={onRemove} />
      {replies.length > 0 && !showReplies && (
        <button
          type="button"
          onClick={() => setShowReplies(true)}
          className="ml-12 self-start rounded text-sm font-medium text-zinc-700 hover:underline focus:outline-2 focus:outline-emerald-600 dark:text-zinc-300"
        >
          View {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </button>
      )}
      {showReplies && (
        <div className="ml-12 flex flex-col gap-2">
          {replies.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label={`Replies to ${comment.author.name}`}>
              {replies.map((r) => (
                <li key={r.id}>
                  <Comment
                    comment={r}
                    small
                    viewerLanguage={viewerLanguage}
                    onReply={() => startReply(r.author.name)}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                </li>
              ))}
            </ul>
          )}
          {replyTo !== null && (
            <Composer
              // A new reply target starts a fresh draft.
              key={replyTo}
              postId={postId}
              parentId={comment.id}
              autoFocus
              initial={replyTo ? `${replyTo} ` : ""}
              placeholder={`Reply to ${comment.author.name}…`}
              onPosted={(all) => {
                onReplaced(all);
                setReplyTo(null);
              }}
            />
          )}
        </div>
      )}
    </li>
  );
}

function Comment({
  comment,
  small = false,
  viewerLanguage,
  onReply,
  onUpdate,
  onRemove,
}: {
  comment: CommentView;
  small?: boolean;
  viewerLanguage: string;
  onReply: () => void;
  onUpdate: (id: string, patch: Partial<CommentView>) => void;
  onRemove: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const total = comment.reactions.reduce((n, r) => n + r.count, 0);
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, startTranslating] = useTransition();
  const canTranslate = comment.language !== null && comment.language !== viewerLanguage;
  const shown = showTranslation && translation;
  // Editing (the author) or reporting (anyone else) happens in place.
  const [mode, setMode] = useState<"view" | "edit" | "report" | "reported">("view");
  const [draft, setDraft] = useState("");
  const [saving, startSaving] = useTransition();
  const draftId = useId();

  function saveEdit() {
    const body = draft.trim();
    if (!body || saving) return;
    startSaving(async () => {
      const result = await editCommentAction(comment.id, body).catch(() => OFFLINE);
      if ("error" in result) return setError(result.error);
      setError(undefined);
      onUpdate(comment.id, result);
      // An old translation no longer matches the new text.
      setTranslation(null);
      setShowTranslation(false);
      setMode("view");
    });
  }

  function sendReport() {
    const reason = draft.trim();
    if (!reason || saving) return;
    startSaving(async () => {
      const result = await reportCommentAction(comment.id, reason).catch(() => OFFLINE);
      if (result.error) return setError(result.error);
      setError(undefined);
      setMode("reported");
    });
  }

  function toggleTranslation() {
    if (showTranslation) return setShowTranslation(false);
    if (translation) return setShowTranslation(true);
    setError(undefined);
    startTranslating(async () => {
      const result = await translateCommentAction(comment.id, viewerLanguage).catch(() => OFFLINE);
      if ("error" in result) return setError(result.error);
      setTranslation(result.text);
      setShowTranslation(true);
    });
  }

  return (
    <div className="flex gap-2">
      <Link href={comment.author.href} tabIndex={-1} aria-hidden className="shrink-0">
        <Avatar name={comment.author.name} imageId={comment.author.photoImageId} className={small ? "size-7 text-xs" : "size-9 text-sm"} />
      </Link>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="relative self-start rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Link href={comment.author.href} className="text-sm font-semibold hover:underline focus:outline-2 focus:outline-emerald-600">
              {comment.author.name}
            </Link>
            {comment.badge && <BackerBadge badge={comment.badge} size="xs" />}
          </span>
          {mode === "edit" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEdit();
              }}
              className="mt-1 flex flex-col gap-1"
            >
              <label htmlFor={draftId} className="sr-only">
                Edit your comment
              </label>
              <textarea
                id={draftId}
                autoFocus
                rows={2}
                value={draft}
                maxLength={COMMENT_MAX}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setMode("view");
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    saveEdit();
                  }
                }}
                className="w-72 max-w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm focus:outline-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span className="flex gap-2 text-xs">
                <button type="submit" disabled={saving || !draft.trim()} className="font-semibold text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setMode("view")} className="font-semibold hover:underline">
                  Cancel
                </button>
              </span>
            </form>
          ) : (
            // lang lets screen readers pronounce the text in the right language.
            <p lang={shown ? viewerLanguage : (comment.language ?? undefined)} className="whitespace-pre-wrap break-words text-sm">
              {shown ? translation : comment.body}
            </p>
          )}
          {total > 0 && (
            <span
              title={comment.reactions.map((r) => `${byKey[r.key].label}: ${r.count}`).join(", ")}
              className="absolute -bottom-2.5 right-1 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-px text-xs shadow dark:bg-zinc-900"
            >
              <span aria-hidden>{comment.reactions.slice(0, 3).map((r) => byKey[r.key].emoji).join("")}</span>
              <span className="sr-only">{comment.reactions.map((r) => `${r.count} ${byKey[r.key].label}`).join(", ")}</span>
              <span aria-hidden className="text-zinc-600 dark:text-zinc-400">{total}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 px-2 text-xs text-zinc-600 dark:text-zinc-400">
          <TimeAgo iso={comment.createdAt} />
          {comment.editedAt && <span title="This comment was changed after it was posted">Edited</span>}
          <ReactionControl comment={comment} onUpdate={onUpdate} onError={setError} />
          <button type="button" onClick={onReply} className="font-semibold hover:underline focus:outline-2 focus:outline-emerald-600">
            Reply
          </button>
          {canTranslate && (
            <button
              type="button"
              onClick={toggleTranslation}
              disabled={translating}
              className="font-semibold text-emerald-700 hover:underline focus:outline-2 focus:outline-emerald-600 disabled:opacity-60 dark:text-emerald-400"
            >
              {translating ? "Translating…" : shown ? "See original" : "See translation"}
            </button>
          )}
          {shown && <span>Translated by AI</span>}
          {comment.mine && mode === "view" && (
            <button
              type="button"
              onClick={() => {
                setDraft(comment.body);
                setMode("edit");
              }}
              className="font-semibold hover:underline focus:outline-2 focus:outline-emerald-600"
            >
              Edit
            </button>
          )}
          {!comment.mine && mode === "view" && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setMode("report");
              }}
              className="font-semibold hover:underline focus:outline-2 focus:outline-emerald-600"
            >
              Report
            </button>
          )}
          {mode === "reported" && <span role="status">Reported. Thanks for letting us know.</span>}
          {comment.canDelete &&
            (confirming ? (
              <span role="group" aria-label="Confirm deleting" className="flex items-center gap-2">
                Delete{small ? "" : " it and its replies"}?
                <button
                  type="button"
                  autoFocus
                  onClick={async () => {
                    const result = await deleteCommentAction(comment.id).catch(() => OFFLINE);
                    if (result.error) setError(result.error);
                    else onRemove(comment.id);
                  }}
                  className="font-semibold text-red-700 hover:underline dark:text-red-400"
                >
                  Yes
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="font-semibold hover:underline">
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="font-semibold hover:underline focus:outline-2 focus:outline-emerald-600">
                Delete
              </button>
            ))}
        </div>
        {mode === "report" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendReport();
            }}
            className="flex flex-wrap items-center gap-2 px-2 text-xs"
          >
            <label htmlFor={draftId}>What&apos;s wrong with it?</label>
            <input
              id={draftId}
              autoFocus
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setMode("view")}
              className="min-w-40 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm focus:outline-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button type="submit" disabled={saving || !draft.trim()} className="font-semibold text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400">
              Send report
            </button>
            <button type="button" onClick={() => setMode("view")} className="font-semibold hover:underline">
              Cancel
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="px-2 text-xs text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * "Like" (or your current reaction): a click likes, or takes your reaction
 * back. Hovering, or the ▾ button for keyboards and touch, opens the full
 * set. Flips at once and flips back if the server says no.
 */
function ReactionControl({
  comment,
  onUpdate,
  onError,
}: {
  comment: CommentView;
  onUpdate: (id: string, patch: Partial<CommentView>) => void;
  onError: (message?: string) => void;
}) {
  const [picker, setPicker] = useState(false);
  const [, startTransition] = useTransition();
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pickerId = useId();
  const current = comment.viewerReaction ? byKey[comment.viewerReaction] : null;

  function react(next: Reaction | null) {
    setPicker(false);
    onError(undefined);
    const before = { reactions: comment.reactions, viewerReaction: comment.viewerReaction };
    // The optimistic count: take back the old reaction, add the new one.
    const counts = new Map(comment.reactions.map((r) => [r.key, r.count]));
    if (before.viewerReaction) counts.set(before.viewerReaction, (counts.get(before.viewerReaction) ?? 1) - 1);
    if (next) counts.set(next, (counts.get(next) ?? 0) + 1);
    const reactions = [...counts].filter(([, n]) => n > 0).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
    onUpdate(comment.id, { reactions, viewerReaction: next });
    startTransition(async () => {
      const result = await reactToCommentAction(comment.id, next).catch(() => OFFLINE);
      if ("error" in result) {
        onUpdate(comment.id, before);
        onError(result.error);
      } else onUpdate(comment.id, result);
    });
  }

  return (
    <span
      className="relative flex items-center"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hoverTimer.current = setTimeout(() => setPicker(true), 450);
      }}
      onPointerLeave={() => {
        clearTimeout(hoverTimer.current);
        setPicker(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setPicker(false);
      }}
    >
      <button
        type="button"
        onClick={() => react(current ? null : "like")}
        aria-pressed={Boolean(current)}
        className={`font-semibold hover:underline focus:outline-2 focus:outline-emerald-600 ${current ? "text-emerald-700 dark:text-emerald-400" : ""}`}
      >
        {current ? `${current.emoji} ${current.label}` : "Like"}
      </button>
      <button
        type="button"
        onClick={() => setPicker(!picker)}
        aria-expanded={picker}
        aria-controls={pickerId}
        aria-label="Choose a reaction"
        className="ml-0.5 rounded px-0.5 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:hover:bg-zinc-800"
      >
        ▾
      </button>
      {picker && (
        <span
          id={pickerId}
          role="group"
          aria-label="Reactions"
          className="absolute bottom-full left-0 z-10 mb-1 flex gap-0.5 rounded-full border border-zinc-200 bg-white px-1.5 py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {REACTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => react(comment.viewerReaction === r.key ? null : r.key)}
              aria-label={r.label}
              aria-pressed={comment.viewerReaction === r.key}
              title={r.label}
              className="rounded-full p-1 text-xl leading-none transition-transform hover:scale-125 focus:scale-125 focus:outline-2 focus:outline-emerald-600 aria-pressed:bg-emerald-100 dark:aria-pressed:bg-emerald-900"
            >
              {r.emoji}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function Composer({
  postId,
  parentId,
  placeholder,
  initial = "",
  autoFocus = false,
  onPosted,
}: {
  postId: string;
  parentId: string | null;
  placeholder: string;
  initial?: string;
  autoFocus?: boolean;
  onPosted: (all: CommentView[]) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const id = useId();

  function post() {
    const body = draft.trim();
    if (!body || pending) return;
    setError(undefined);
    startTransition(async () => {
      const result = await addCommentAction(postId, body, parentId).catch(() => OFFLINE);
      if ("error" in result) return setError(result.error);
      setDraft("");
      onPosted(result.comments);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        post();
      }}
      className="flex flex-col gap-1"
    >
      <div className="flex items-end gap-2">
        <label htmlFor={id} className="sr-only">
          {placeholder}
        </label>
        <textarea
          id={id}
          rows={1}
          value={draft}
          maxLength={COMMENT_MAX}
          autoFocus={autoFocus}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter posts; Shift+Enter starts a new line.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              post();
            }
          }}
          placeholder={placeholder}
          aria-describedby={error ? `${id}-error` : undefined}
          className="max-h-32 min-h-9 flex-1 resize-y rounded-2xl border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={!draft.trim() || pending}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
