import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";

const secondaryButton =
  "rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800";

const ROLE_LABELS = { user: "Supporter", nonprofit: "Nonprofit", sponsor: "Sponsor" } as const;

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
        <AuthStatus />
      </Suspense>
    </main>
  );
}

async function AuthStatus() {
  const session = await getSession();

  if (session) {
    const { id, name, role, onboarded } = session.user;
    // Profile setup isn't optional: the feed needs interests and donations need a payee.
    if (!onboarded) redirect("/onboarding");
    const profileLink =
      role === "nonprofit" ? `/nonprofits/${id}` : role === "sponsor" ? `/sponsors/${id}` : null;

    return (
      <div className="flex flex-col items-center gap-3">
        <p>
          Signed in as <strong>{name}</strong> ({ROLE_LABELS[role]})
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {profileLink && (
            <Link href={profileLink} className={secondaryButton}>
              View your profile
            </Link>
          )}
          <Link href="/onboarding" className={secondaryButton}>
            {role === "user" ? "Edit interests" : "Edit profile"}
          </Link>
          <form action={signOutAction}>
            <button type="submit" className={secondaryButton}>
              Log out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Link
        href="/signup"
        className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
      >
        Sign up
      </Link>
      <Link href="/login" className={secondaryButton}>
        Log in
      </Link>
    </div>
  );
}
