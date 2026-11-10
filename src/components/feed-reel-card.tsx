"use client";

import { Clapperboard, Heart, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { CoverText } from "@/components/cover-text";
import { DonateButton } from "@/components/donate-button";
import type { ReelView } from "@/lib/reels/queries";

/**
 * A reel inside the home feed, the way social apps mix short videos in with
 * posts: it plays muted while it's mostly on screen and pauses when it
 * scrolls away. Tapping the video opens the full reels view at this reel.
 */
export function FeedReelCard({ reel, donateClientId }: { reel: ReelView; donateClientId: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.6 },
    );
    observer.observe(v);
    return () => observer.disconnect();
  }, []);

  return (
    <article aria-label={`Reel from ${reel.nonprofit.name}`} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="flex items-center gap-3">
        <Link href={`/nonprofits/${reel.nonprofit.id}`} className="flex items-center gap-3 rounded-lg focus:outline-2 focus:outline-zinc-900 dark:focus:outline-white">
          <Avatar name={reel.nonprofit.name} imageId={reel.nonprofit.logoImageId} className="size-10 text-base" />
          <span className="font-semibold">{reel.nonprofit.name}</span>
        </Link>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <Clapperboard aria-hidden className="size-3.5" />
          Reel
        </span>
      </header>

      <div className="relative mx-auto aspect-[9/16] w-full max-w-[20rem] overflow-hidden rounded-xl bg-black">
        <Link href={`/reels?start=${reel.id}`} aria-label={`Watch this reel from ${reel.nonprofit.name} in Reels`} className="block size-full focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:focus:outline-white">
          <video
            ref={video}
            src={reel.src}
            poster={reel.poster ?? undefined}
            muted={muted}
            loop
            playsInline
            preload="none"
            aria-hidden
            className="size-full object-cover"
          />
        </Link>
        {reel.coverText && <CoverText text={reel.coverText} position={reel.coverTextPosition} on="video" />}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-black/60 text-white focus:outline-2 focus:outline-white"
        >
          {muted ? <VolumeX aria-hidden className="size-5" /> : <Volume2 aria-hidden className="size-5" />}
        </button>
      </div>

      {reel.caption && <p className="whitespace-pre-line">{reel.caption}</p>}

      <footer className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
        <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <Heart aria-hidden className="size-4" />
          {reel.likes} {reel.likes === 1 ? "like" : "likes"}
        </span>
        {donateClientId && <DonateButton nonprofitId={reel.nonprofit.id} nonprofitName={reel.nonprofit.name} clientId={donateClientId} />}
        <Link href={`/reels?start=${reel.id}`} className="ml-auto font-medium underline focus:outline-2 focus:outline-zinc-900 dark:focus:outline-white">
          Watch in Reels
        </Link>
      </footer>
    </article>
  );
}
