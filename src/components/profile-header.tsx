import { imageUrl } from "@/lib/images";

export function Logo({ name, imageId, size = "size-20 text-2xl" }: { name: string; imageId: string | null; size?: string }) {
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
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function ProfileHeader({
  name,
  imageId,
  kicker,
  verified = false,
}: {
  name: string;
  imageId: string | null;
  kicker: string;
  verified?: boolean;
}) {
  return (
    <header className="flex items-center gap-4">
      <Logo name={name} imageId={imageId} />
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{kicker}</p>
        <h1 className="text-2xl font-bold">{name}</h1>
        {verified && <VerifiedBadge />}
      </div>
    </header>
  );
}

export function VerifiedBadge() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
      Verified nonprofit
    </span>
  );
}
