import Link from "next/link";

/** A titled box in the feed's side columns, with an optional "See all" link. */
export function SidebarSection({
  title,
  href,
  linkLabel = "See all",
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  const headingId = `sidebar-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        {href && (
          <Link href={href} className="text-sm font-medium text-emerald-700 hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:text-emerald-400">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function SidebarEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-600 dark:text-zinc-400">{children}</p>;
}
