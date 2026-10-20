"use client";

import { Pause, Play, Trash2, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { DonateButton } from "@/components/donate-button";
import { TimeAgo } from "@/components/local-time";
import { deleteStoryAction, recordStoryViewAction } from "@/lib/stories/actions";
import type { StoryOrg } from "@/lib/stories/queries";

const PHOTO_MS = 5_000; // how long a photo story stays up
const HOLD_MS = 200; // pressing longer than this pauses instead of moving on

const firstUnseen = (org: StoryOrg) => Math.max(0, org.stories.findIndex((s) => !s.seen));

/**
 * Full-screen stories. Tap the right side (or →) for the next story, the
 * left third (or ←) for the previous one; press and hold, or Space, to
 * pause; Esc closes. After an organization's last story it moves on to the
 * next organization in the row.
 */
export function StoryViewer({
  orgs,
  startAt,
  onSeen,
  onClose,
  donateClientId,
}: {
  orgs: StoryOrg[];
  startAt: number;
  onSeen: (orgIndex: number, storyId: string) => void;
  onClose: () => void;
  donateClientId: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const held = useRef(false);
  const [pos, setPos] = useState({ org: startAt, story: firstUnseen(orgs[startAt]) });
  const [progress, setProgress] = useState(0); // 0..1 through the current story
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const org = orgs[pos.org];
  const story = org?.stories[pos.story];

  const go = (orgIndex: number, storyIndex: number) => {
    setPos({ org: orgIndex, story: storyIndex });
    setProgress(0);
    setFailed(false);
    setConfirmDelete(false);
  };
  const close = () => dialogRef.current?.close();
  const next = () => {
    if (pos.story < org.stories.length - 1) go(pos.org, pos.story + 1);
    else if (pos.org < orgs.length - 1) go(pos.org + 1, firstUnseen(orgs[pos.org + 1]));
    else close();
  };
  const prev = () => {
    if (pos.story > 0) go(pos.org, pos.story - 1);
    else if (pos.org > 0) go(pos.org - 1, orgs[pos.org - 1].stories.length - 1);
    else {
      setProgress(0);
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  };
  const onTimerEnd = useEffectEvent(next);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Count the view once, and turn the ring grey.
  const markSeen = useEffectEvent((storyId: string, seen: boolean) => {
    if (seen) return;
    void recordStoryViewAction(storyId);
    onSeen(pos.org, storyId);
  });
  useEffect(() => {
    if (story) markSeen(story.id, story.seen);
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- once per story shown

  // Photos run on a timer; videos report their own progress (below).
  useEffect(() => {
    if (!story || story.kind !== "image" || paused) return;
    const startedAt = performance.now() - progress * PHOTO_MS;
    let frame = requestAnimationFrame(function tick(now) {
      const p = (now - startedAt) / PHOTO_MS;
      if (p >= 1) return onTimerEnd();
      setProgress(p);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [story?.id, paused]); // eslint-disable-line react-hooks/exhaustive-deps -- progress is read once, on (re)start

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else video.play().catch(() => {}); // autoplay can be refused; the user can tap play
  }, [paused, story?.id]);

  if (!org || !story) return null;
  const sticker = org.own ? (story.sticker === "link" ? "link" : "none") : story.sticker;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={`Stories from ${org.name}`}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
        if (e.key === "ArrowRight") next();
        else if (e.key === "ArrowLeft") prev();
        else if (e.key === " " && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          setPaused((p) => !p);
        }
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
    >
      <div className="relative mx-auto flex h-full max-w-md flex-col">
        <p className="sr-only" aria-live="polite">
          Story {pos.story + 1} of {org.stories.length} from {org.name}
          {paused ? ", paused" : ""}
        </p>

        {/* One bar per story: full for the ones before, filling for the current one. */}
        <div className="flex gap-1 px-3 pt-3" aria-hidden>
          {org.stories.map((s, i) => (
            <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
              <span
                className="block h-full bg-white"
                style={{ width: `${i < pos.story ? 100 : i > pos.story ? 0 : Math.min(100, progress * 100)}%` }}
              />
            </span>
          ))}
        </div>

        <header className="flex items-center gap-2 px-3 py-2">
          <Link
            href={`/nonprofits/${org.id}`}
            onClick={close}
            className="flex min-w-0 items-center gap-2 rounded-lg focus:outline-2 focus:outline-white"
          >
            <Avatar name={org.name} imageId={org.logoImageId} className="size-8 text-sm" />
            <span className="truncate text-sm font-semibold">{org.name}</span>
          </Link>
          <span className="shrink-0 text-xs text-white/75">
            <TimeAgo iso={story.createdAt} />
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {story.kind === "video" && (
              <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className={iconButton}>
                {muted ? <VolumeX aria-hidden className="size-5" /> : <Volume2 aria-hidden className="size-5" />}
              </button>
            )}
            <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play" : "Pause"} className={iconButton}>
              {paused ? <Play aria-hidden className="size-5" /> : <Pause aria-hidden className="size-5" />}
            </button>
            <button type="button" onClick={close} aria-label="Close stories" autoFocus className={iconButton}>
              <X aria-hidden className="size-6" />
            </button>
          </span>
        </header>

        {/* The tap area: left third goes back, the rest goes forward; hold to pause. */}
        <div
          className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center"
          onPointerDown={() => {
            held.current = false;
            holdTimer.current = setTimeout(() => {
              held.current = true;
              setPaused(true);
            }, HOLD_MS);
          }}
          onPointerUp={(e) => {
            clearTimeout(holdTimer.current);
            if (held.current) return setPaused(false);
            const box = e.currentTarget.getBoundingClientRect();
            if (e.clientX - box.left < box.width / 3) prev();
            else next();
          }}
          onPointerCancel={() => clearTimeout(holdTimer.current)}
        >
          {failed ? (
            <p className="px-6 text-center text-sm text-white/80">This story couldn&apos;t be loaded. Tap to continue.</p>
          ) : story.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- served from our own API
            <img src={story.src} alt={story.caption || `Story from ${org.name}`} draggable={false} onError={() => setFailed(true)} className="max-h-full w-full object-contain" />
          ) : (
            <video
              key={story.id}
              ref={videoRef}
              src={story.src}
              autoPlay
              playsInline
              muted={muted}
              aria-label={story.caption || `Video story from ${org.name}`}
              onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
              onEnded={next}
              onError={() => setFailed(true)}
              className="max-h-full w-full object-contain"
            />
          )}
        </div>

        <footer className="flex flex-col gap-3 px-4 pb-6 pt-3">
          {story.caption && <p className="text-base leading-snug [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">{story.caption}</p>}
          {/* Stickers pause the story, so it doesn't move on while someone donates. */}
          <div className="flex flex-wrap items-center gap-2" onClickCapture={() => setPaused(true)}>
            {sticker === "donate" && (
              <DonateButton nonprofitId={org.id} nonprofitName={org.name} clientId={donateClientId} />
            )}
            {sticker === "link" && story.linkUrl && (
              <a
                href={story.linkUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-white"
              >
                {new URL(story.linkUrl).hostname} ↗
              </a>
            )}
          </div>
          {org.own && (
            <div className="flex items-center justify-between gap-2 text-sm text-white/80">
              <span>
                Seen by {story.viewCount ?? 0} {story.viewCount === 1 ? "person" : "people"}
              </span>
              {confirmDelete ? (
                <span className="flex items-center gap-2">
                  <span>Delete this story?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await deleteStoryAction(story.id);
                      if (!result.error) {
                        close();
                        router.refresh();
                      }
                    }}
                    className="rounded-lg bg-red-700 px-3 py-1 font-semibold text-white focus:outline-2 focus:outline-white"
                  >
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-2 py-1 focus:outline-2 focus:outline-white">
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPaused(true);
                    setConfirmDelete(true);
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/10 focus:outline-2 focus:outline-white"
                >
                  <Trash2 aria-hidden className="size-4" /> Delete
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </dialog>
  );
}

const iconButton = "rounded-full p-1.5 hover:bg-white/15 focus:outline-2 focus:outline-white";
