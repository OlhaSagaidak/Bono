import { imageUrl } from "@/lib/image-url";

/** Small round photo, or the first letter of the name. Works in server and client components. */
export function Avatar({ name, imageId, className = "size-10" }: { name: string; imageId: string | null; className?: string }) {
  if (imageId) {
    // eslint-disable-next-line @next/next/no-img-element -- served from our own API, no optimization needed
    return <img src={imageUrl(imageId)} alt="" className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-bold text-zinc-900 dark:text-zinc-100 dark:bg-zinc-700`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
