import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Bono</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Nonprofits are the influencers. Scroll guilt free: follow, like and
        donate to causes you care about.
      </p>
      {/* The hero above is static; only the session-dependent part waits on the request. */}
      <Suspense fallback={<div className="h-10" aria-hidden />}>
        <SignedInRedirect />
      </Suspense>
    </main>
  );
}

// The landing page is for visitors. Signed-in people go where they can act:
// the feed, or profile setup if that isn't finished (the feed needs interests,
// donations need a payee).
async function SignedInRedirect() {
  const session = await getSession();
  if (session) redirect(session.user.onboarded ? "/feed" : "/onboarding");

  return (
    <div className="flex gap-3">
      <Link
        href="/signup"
        className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
      >
        Sign up
      </Link>
      <Link
        href="/login"
        className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Log in
      </Link>
    </div>
  );
}
