import Link from "next/link";

const tabClass =
  "rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:focus:outline-white aria-[current=page]:bg-zinc-900 dark:aria-[current=page]:bg-white aria-[current=page]:text-white dark:aria-[current=page]:text-zinc-900 dark:hover:bg-zinc-800";

/** Tabs on your own profile: the public section, and the private Saved tab. */
export function ProfileTabs({ basePath, first, savedActive }: { basePath: string; first: string; savedActive: boolean }) {
  return (
    <nav aria-label="Profile sections" className="flex gap-2">
      <Link href={basePath} aria-current={savedActive ? undefined : "page"} className={tabClass}>
        {first}
      </Link>
      <Link href={`${basePath}?tab=saved`} aria-current={savedActive ? "page" : undefined} className={tabClass}>
        Saved
      </Link>
    </nav>
  );
}
