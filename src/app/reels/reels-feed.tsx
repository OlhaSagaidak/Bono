"use client";

import { Bookmark, Heart, Link2, Trash2, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { DonateButton } from "@/components/donate-button";
import { deleteReelAction, toggleReelLikeAction, toggleReelSaveAction } from "@/lib/reels/actions";
import type { ReelView } from "@/lib/reels/queries";

const OFFLINE = { error: "Couldn't reach Bono. Check your connection and try again." };

/**
 * Full-height reels that snap into place one at a time. The one on screen
 * plays (muted until you unmute; the choice carries over to the next reel)
 * and pauses as soon as it scrolls away. Tap a video to pause it.
 */
export function ReelsFeed({ reels, viewerId, donateClientId }: { reels: ReelView[]; viewerId: string; donateClientId: string }) {
  const [muted, setMuted] = useState(true);
  const container = useRef<HTMLDivElement>(null);

  // Play whichever reel is mostly on screen; pause the rest.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target.querySelector("video");
          if (!video) continue;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        }
      },
      { root: container.current, threshold: 0.6 },
    );
    container.current?.querySelectorAll("[data-reel]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels]);

  return (
    <div
      ref={container}
      tabIndex={0}
      aria-label="Reels. Scroll or use the arrow keys to move between them."
      className="h-[calc(100dvh-3.75rem)] snap-y snap-mandatory overflow-y-scroll bg-black focus:outline-none"
    >
      {reels.map((reel) => (
        <Reel
          key={reel.id}
          reel={reel}
          own={reel.nonprofit.id === viewerId}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          donateClientId={donateClientId}
        />
      ))}
    </div>
  );
}

function Reel({
  reel,
  own,
  muted,
  onToggleMute,
  donateClientId,
}: {
  reel: ReelView;
  own: boolean;
  muted: boolean;
  onToggleMute: () => void;
  donateClientId: string;
}) {
  const router = useRouter();
  const [like, setLike] = useState({ liked: reel.liked, likes: reel.likes });
  const [saved, setSaved] = useState(reel.saved);
  const [status, setStatus] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  // Both toggles flip at once and flip back if the server refuses.
  function toggleLike() {
    const before = like;
    setLike({ liked: !before.liked, likes: before.likes + (before.liked ? -1 : 1) });
    startTransition(async () => {
      const result = await toggleReelLikeAction(reel.id).catch(() => OFFLINE);
      if ("error" in result) {
        setLike(before);
        setStatus(result.error);
      } else setLike(result);
    });
  }
  function toggleSave() {
    const before = saved;
    setSaved(!before);
    startTransition(async () => {
      const result = await toggleReelSaveAction(reel.id).catch(() => OFFLINE);
      if ("error" in result) {
        setSaved(before);
        setStatus(result.error);
      } else {
        setSaved(result.saved);
        setStatus(result.saved ? "Saved to your profile." : "Removed from saved.");
      }
    });
  }
  async function share() {
    const url = `${window.location.origin}/reels?start=${reel.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied.");
    } catch {
      setStatus(`Copy this link: ${url}`);
    }
  }

  return (
    <section
      data-reel
      aria-label={`Reel from ${reel.nonprofit.name}`}
      className="flex h-full snap-start snap-always items-center justify-center"
    >
      {/* A 9:16 frame, so captions and buttons sit on the video even on wide screens. */}
      <div className="relative aspect-[9/16] h-full max-w-full">
        <video
          src={reel.src}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          aria-label={reel.caption || `Video from ${reel.nonprofit.name}`}
          onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play().catch(() => {}) : e.currentTarget.pause())}
          className="h-full w-full cursor-pointer object-contain"
        />

        {/* Text sits on a gradient so it stays readable over any video. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-16 text-white">
          <div className="pointer-events-auto mr-16 flex flex-col gap-2">
            <Link
              href={`/nonprofits/${reel.nonprofit.id}`}
              className="flex items-center gap-2 self-start rounded-lg font-semibold focus:outline-2 focus:outline-white"
            >
              <Avatar name={reel.nonprofit.name} imageId={reel.nonprofit.logoImageId} className="size-9 text-sm" />
              {reel.nonprofit.name}
            </Link>
            {reel.caption && <p className="text-sm leading-snug">{reel.caption}</p>}
            {reel.causes.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Causes">
                {reel.causes.map((c) => (
                  <li key={c.slug} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
            {!own && (
              <div className="self-start">
                <DonateButton nonprofitId={reel.nonprofit.id} nonprofitName={reel.nonprofit.name} clientId={donateClientId} />
              </div>
            )}
            <p role="status" className="min-h-5 text-sm text-white/85">
              {status}
            </p>
          </div>
        </div>

        <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4 text-white">
          {!own && (
            <button
              type="button"
              onClick={toggleLike}
              aria-pressed={like.liked}
              aria-label={`Like, ${like.likes}`}
              className={actionButton}
            >
              <Heart aria-hidden className={`size-7 ${like.liked ? "fill-rose-500 stroke-rose-500" : ""}`} />
              <span className="text-xs">{like.likes}</span>
            </button>
          )}
          <button type="button" onClick={toggleSave} aria-pressed={saved} aria-label={saved ? "Saved" : "Save"} className={actionButton}>
            <Bookmark aria-hidden className={`size-7 ${saved ? "fill-white" : ""}`} />
            <span className="text-xs">{saved ? "Saved" : "Save"}</span>
          </button>
          <button type="button" onClick={share} aria-label="Share: copy link" className={actionButton}>
            <Link2 aria-hidden className="size-7" />
            <span className="text-xs">Share</span>
          </button>
          <button type="button" onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"} className={actionButton}>
            {muted ? <VolumeX aria-hidden className="size-7" /> : <Volume2 aria-hidden className="size-7" />}
          </button>
          {own &&
            (confirmDelete ? (
              <span className="flex flex-col items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    const result = await deleteReelAction(reel.id).catch(() => OFFLINE);
                    if (result.error) setStatus(result.error);
                    else router.refresh();
                  }}
                  className="rounded-lg bg-red-700 px-2 py-1 font-semibold focus:outline-2 focus:outline-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1 focus:outline-2 focus:outline-white"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete reel" className={actionButton}>
                <Trash2 aria-hidden className="size-6" />
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}

const actionButton =
  "flex flex-col items-center gap-0.5 rounded-full p-1 [filter:drop-shadow(0_1px_2px_rgb(0_0_0/0.6))] focus:outline-2 focus:outline-white";
