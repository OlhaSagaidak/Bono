import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { AccountMenu } from "@/components/account-menu";
import { db } from "@/db";
import { nonprofitProfiles } from "@/db/schema";

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

  const { id, role, name, onboarded } = session.user;
  // Until onboarding is done the only way forward is the onboarding form.
  if (!onboarded) {
    return (
      <nav aria-label="Main" className="flex items-center gap-1">
        <AccountMenu name={name ?? ""} links={[]} />
      </nav>
    );
  }

  // An unverified nonprofit can't post yet, so its main action is getting verified.
  const verified =
    role === "nonprofit" &&
    Boolean((await db.query.nonprofitProfiles.findFirst({ where: eq(nonprofitProfiles.userId, id), columns: { verifiedAt: true } }))?.verifiedAt);
  const mainAction =
    role === "nonprofit"
      ? verified
        ? { href: "/posts/new", label: "New post" }
        : { href: "/verify", label: "Get verified" }
      : role === "sponsor"
        ? { href: "/campaigns", label: "Campaigns" }
        : null;
  const accountLinks = [
    ...(role === "nonprofit" ? [{ href: `/nonprofits/${id}`, label: "Your page" }] : []),
    ...(role === "sponsor" ? [{ href: `/sponsors/${id}`, label: "Your page" }] : []),
    { href: "/onboarding", label: role === "user" ? "Your interests" : "Edit profile" },
  ];

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      <Link href="/feed" className={navLink}>
        Feed
      </Link>
      {mainAction && (
        <Link href={mainAction.href} className={navLink}>
          {mainAction.label}
        </Link>
      )}
      <AccountMenu name={name ?? ""} links={accountLinks} />
    </nav>
  );
}
