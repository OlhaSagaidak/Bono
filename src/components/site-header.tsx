import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:hover:bg-zinc-800";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="rounded-lg px-1 text-xl font-bold tracking-tight focus:outline-2 focus:outline-emerald-600">
          Bono
        </Link>
        {/* The logo is static; only the links that depend on who's signed in wait for the request. */}
        <Suspense fallback={<div className="h-9" aria-hidden />}>
          <Nav />
        </Suspense>
      </div>
    </header>
  );
}

async function Nav() {
  const session = await getSession();
  if (!session) {
    return (
      <nav aria-label="Account" className="flex gap-1">
        <Link href="/login" className={navLink}>
          Log in
        </Link>
        <Link href="/signup" className={navLink}>
          Sign up
        </Link>
      </nav>
    );
  }

  const { id, role, onboarded } = session.user;
  const profileHref = role === "nonprofit" ? `/nonprofits/${id}` : role === "sponsor" ? `/sponsors/${id}` : null;

  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
      {/* Until onboarding is done the only way forward is the onboarding form. */}
      {onboarded && (
        <>
          <Link href="/feed" className={navLink}>
            Feed
          </Link>
          {role === "nonprofit" && (
            <Link href="/posts/new" className={navLink}>
              New post
            </Link>
          )}
          {role === "sponsor" && (
            <Link href="/campaigns" className={navLink}>
              Campaigns
            </Link>
          )}
          {profileHref && (
            <Link href={profileHref} className={navLink}>
              Profile
            </Link>
          )}
          <Link href="/onboarding" className={navLink}>
            {role === "user" ? "Interests" : "Edit profile"}
          </Link>
        </>
      )}
      <form action={signOutAction}>
        <button type="submit" className={navLink}>
          Log out
        </button>
      </form>
    </nav>
  );
}
