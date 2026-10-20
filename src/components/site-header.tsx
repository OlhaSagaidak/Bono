import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { AccountMenu } from "@/components/account-menu";
import { TopNav } from "@/components/top-nav";
import { db } from "@/db";
import { nonprofitProfiles } from "@/db/schema";
import { unreadConversationCount } from "@/lib/messages/queries";
import { unreadNotificationCount } from "@/lib/notifications/queries";
import { profilePath } from "@/lib/profiles/paths";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:hover:bg-zinc-800";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-1.5">
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

  // The role's own actions live in the account menu; an unverified nonprofit's
  // first one is getting verified, since it can't post yet.
  const verified =
    role === "nonprofit" &&
    Boolean((await db.query.nonprofitProfiles.findFirst({ where: eq(nonprofitProfiles.userId, id), columns: { verifiedAt: true } }))?.verifiedAt);
  const accountLinks = [
    ...(role === "nonprofit" ? [verified ? { href: "/posts/new", label: "New post" } : { href: "/verify", label: "Get verified" }] : []),
    ...(verified ? [{ href: "/stories/new", label: "New story" }] : []),
    ...(role === "sponsor" ? [{ href: "/campaigns", label: "Campaigns & boosts" }] : []),
    { href: profilePath(role, id), label: "Your profile" },
    { href: `${profilePath(role, id)}?tab=saved`, label: "Saved posts" },
    { href: "/profile/edit", label: "Edit profile" },
  ];

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      <TopNav unreadNotifications={await unreadNotificationCount(id)} unreadMessages={await unreadConversationCount(id)} />
      <AccountMenu name={name ?? ""} links={accountLinks} />
    </nav>
  );
}
