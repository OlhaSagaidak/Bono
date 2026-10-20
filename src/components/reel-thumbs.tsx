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
            className="block w-28 overflow-hidden rounded-xl bg-black focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
          >
            {/* "#t=0.1" makes browsers show a frame instead of a black box, without autoplaying. */}
            <video src={`${r.src}#t=0.1`} muted playsInline preload="metadata" aria-hidden className="pointer-events-none aspect-[9/16] w-full object-cover" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
