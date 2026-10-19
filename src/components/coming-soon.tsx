import Link from "next/link";

/** Temporary page for top-bar destinations built in later slices. */
export function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{children}</p>
      <Link href="/feed" className="font-medium text-emerald-700 underline dark:text-emerald-400">
        Back to your feed
      </Link>
    </main>
  );
}
