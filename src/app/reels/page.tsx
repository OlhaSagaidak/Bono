import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { db } from "@/db";
import { nonprofitProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { payPalClientId } from "@/lib/paypal/public-config";
import { getReels } from "@/lib/reels/queries";
import { ReelsFeed } from "./reels-feed";

export const metadata = { title: "Reels · Bono" };

export default function ReelsPage({ searchParams }: PageProps<"/reels">) {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">Reels</h1>
      <Suspense fallback={<p className="px-4 py-8 text-zinc-600 dark:text-zinc-400">Loading reels…</p>}>
        <Reels searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Reels({ searchParams }: { searchParams: PageProps<"/reels">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");
  const { id, role } = session.user;
  const { start } = await searchParams;
  const startId = z.uuid().safeParse(start);
  const [reels, profile] = await Promise.all([
    getReels(id, startId.success ? startId.data : undefined),
    role === "nonprofit" ? db.query.nonprofitProfiles.findFirst({ where: eq(nonprofitProfiles.userId, id), columns: { verifiedAt: true } }) : null,
  ]);
  const canPost = Boolean(profile?.verifiedAt);

  return (
    <>
      {canPost && (
        <Link
          href="/reels/new"
          className="fixed bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-lg hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
        >
          New reel
        </Link>
      )}
      {reels.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          No reels yet. {canPost ? "Post the first one: a short vertical video about your work." : "Check back soon."}
        </div>
      ) : (
        <ReelsFeed reels={reels} viewerId={id} donateClientId={payPalClientId()} />
      )}
    </>
  );
}
