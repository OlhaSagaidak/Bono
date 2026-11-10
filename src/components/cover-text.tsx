export type CoverTextPosition = "top" | "middle" | "bottom";

export const COVER_TEXT_MAX = 140;

export const COVER_TEXT_POSITIONS = [
  { value: "top", label: "Upper third" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Lower third" },
] as const;

// Where the text sits. On reels the lower position stays above the caption
// and buttons at the bottom of the screen.
const PLACEMENT = {
  photo: { top: "top-[10%]", middle: "top-1/2 -translate-y-1/2", bottom: "bottom-[10%]" },
  video: { top: "top-[16%]", middle: "top-[42%] -translate-y-1/2", bottom: "bottom-[34%]" },
} as const;

/**
 * Text over a photo or video, the way reels and social posts put their point
 * on the picture: centered, bold white with a dark outline so it reads on any
 * background, placed where it covers the least (the poster picks top, middle
 * or bottom). Real text, not burned into the image, so it stays sharp,
 * screen readers read it, and it can be edited.
 */
export function CoverText({ text, position = "middle", on = "photo" }: { text: string; position?: CoverTextPosition; on?: "photo" | "video" }) {
  return (
    <p
      className={`pointer-events-none absolute inset-x-0 mx-auto max-w-[88%] text-center font-extrabold leading-snug text-white [text-wrap:balance] ${
        on === "video" ? "text-[1.35rem]" : "text-lg sm:text-xl"
      } ${PLACEMENT[on][position]}`}
      style={{
        // An outline in every direction plus a soft shadow: readable on white and on black.
        textShadow:
          "0 0 2px #000, 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 2px 6px rgb(0 0 0 / 0.6)",
      }}
    >
      {text}
    </p>
  );
}
