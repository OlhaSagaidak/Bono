/**
 * A short headline over the top of a photo or video, the way social posts put
 * their point in a few words on the picture. It's real text (not burned into
 * the image), so it stays sharp, screen readers read it, and it can be edited.
 * The gradient keeps it readable on any picture.
 */
export function CoverText({ text, size = "md" }: { text: string; size?: "md" | "lg" }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/35 to-transparent px-4 pb-10 pt-4">
      <p
        className={`font-bold leading-tight text-white [text-wrap:balance] [text-shadow:0_1px_3px_rgb(0_0_0/0.5)] ${size === "lg" ? "text-2xl" : "text-xl"}`}
      >
        {text}
      </p>
    </div>
  );
}
