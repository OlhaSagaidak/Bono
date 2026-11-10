import { Play } from "lucide-react";
import Link from "next/link";
import type { ReelView } from "@/lib/reels/queries";

/** A row of reel thumbnails (the video's first frame); each opens /reels at that reel. */
export function ReelThumbs({ reels }: { reels: ReelView[] }) {
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {reels.map((r) => (
        <li key={r.id} className="shrink-0">
          <Link
            href={`/reels?start=${r.id}`}
            aria-label={`Reel from ${r.nonprofit.name}${r.caption ? `: ${r.caption}` : ""}`}
            className="relative block w-28 overflow-hidden rounded-xl bg-zinc-800 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:focus:outline-white"
          >
            {r.poster ? (
              // eslint-disable-next-line @next/next/no-img-element -- served from our own image route, already sized
              <img src={r.poster} alt="" loading="lazy" className="aspect-[9/16] w-full object-cover" />
            ) : (
              // No poster (an older upload): "#t=0.1" makes most browsers show a frame.
              // iPhones load nothing until play, so the icon and caption still label the tile.
              <video src={`${r.src}#t=0.1`} muted playsInline preload="metadata" aria-hidden className="pointer-events-none aspect-[9/16] w-full object-cover" />
            )}
            <span aria-hidden className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-9 items-center justify-center rounded-full bg-black/50">
                <Play className="size-4 translate-x-px fill-white text-white" />
              </span>
            </span>
            {r.caption && (
              <span aria-hidden className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[11px] leading-tight text-white">
                {r.caption}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
