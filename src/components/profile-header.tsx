import { imageUrl } from "@/lib/images";

export function Logo({ name, imageId, size = "size-20" }: { name: string; imageId: string | null; size?: string }) {
  if (imageId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- served from our own API, no optimization needed
      <img src={imageUrl(imageId)} alt={`${name} logo`} className={`${size} shrink-0 rounded-full object-cover`} />
    );
  }
  // No logo yet: show the first letter so every profile still has a mark.
  return (
    <div
      aria-hidden
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function ProfileHeader({
  name,
  imageId,
  kicker,
}: {
  name: string;
  imageId: string | null;
  kicker: string;
}) {
  return (
    <header className="flex items-center gap-4">
      <Logo name={name} imageId={imageId} />
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{kicker}</p>
        <h1 className="text-2xl font-bold">{name}</h1>
      </div>
    </header>
  );
}
