"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

// Shown when a page fails unexpectedly. The header stays (it's in the layout),
// so people can always get back to their feed.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        This page didn&apos;t load. Please try again in a moment.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
        >
          Try again
        </button>
        <Link
          href="/feed"
          className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Go to your feed
        </Link>
      </div>
      {error.digest && <p className="text-xs text-zinc-500">Error reference: {error.digest}</p>}
    </main>
  );
}
