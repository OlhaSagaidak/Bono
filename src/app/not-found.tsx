import Link from "next/link";

export const metadata = { title: "Page not found · Bono" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">404</p>
      <h1 className="text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        The link may be old, or the page may have been removed. Nonprofits that aren&apos;t verified yet don&apos;t have
        public pages either.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
      >
        Back to Bono
      </Link>
    </main>
  );
}
