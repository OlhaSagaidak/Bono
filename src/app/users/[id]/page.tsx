import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { BadgesSection } from "@/components/badges-section";
import { MessageButton } from "@/components/message-button";
import { Logo, ProfileHeader } from "@/components/profile-header";
import { ProfileTabs } from "@/components/profile-tabs";
import { SavedPosts } from "@/components/saved-posts";
import { getSession } from "@/lib/auth/session";
import { getFollowedOrgs } from "@/lib/engagement/queries";
import { getAccount } from "@/lib/profiles/queries";

export const metadata = { title: "Profile · Bono" };

export default function UserPage({ params, searchParams }: PageProps<"/users/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <UserProfile params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Supporter profiles: name, photo, bio and the organizations they follow.
// Signed-in people only, since it shows who someone follows.
async function UserProfile({ params, searchParams }: Pick<PageProps<"/users/[id]">, "params" | "searchParams">) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const account = await getAccount(id);
  // Nonprofits and sponsors have their own profile pages.
  if (!account) notFound();
  if (account.role === "nonprofit") redirect(`/nonprofits/${id}`);
  if (account.role === "sponsor") redirect(`/sponsors/${id}`);

  const isOwner = session.user.id === id;
  // The Saved tab is private: anyone else asking for it gets the public profile.
  const { tab, before } = await searchParams;
  const savedTab = isOwner && tab === "saved";
  const cursor = z.uuid().safeParse(before);
  const following = savedTab ? [] : await getFollowedOrgs(id);

  return (
    <>
      <title>{`${account.name} · Bono`}</title>
      <ProfileHeader name={account.name} imageId={account.photoImageId} kicker="Supporter" />
      {account.bio ? (
        <p className="text-lg whitespace-pre-line">{account.bio}</p>
      ) : (
        isOwner && <p className="text-zinc-600 dark:text-zinc-400">You haven&apos;t written a bio yet.</p>
      )}
      {!isOwner && (
        <div className="flex">
          <MessageButton userId={id} size="large" />
        </div>
      )}
      {isOwner && (
        <Link
          href="/profile/edit"
          className="self-start rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Edit profile
        </Link>
      )}
      {!savedTab && <BadgesSection userId={id} role="user" isOwner={isOwner} showBadges={account.showBadges} />}
      {isOwner && <ProfileTabs basePath={`/users/${id}`} first="Follows" savedActive={savedTab} />}
      {savedTab ? (
        <SavedPosts userId={id} basePath={`/users/${id}`} before={cursor.success ? cursor.data : undefined} />
      ) : (
        <section aria-labelledby="follows-heading" className="flex flex-col gap-3">
          <h2 id="follows-heading" className="text-xl font-semibold">
            Follows
          </h2>
          {following.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">Not following any organizations yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {following.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/nonprofits/${o.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 hover:border-emerald-600 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-800"
                  >
                    <Logo name={o.name} imageId={o.logoImageId} size="size-10 text-base" />
                    <span className="truncate font-medium">{o.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
