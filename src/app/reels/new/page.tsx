import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { getNonprofitProfile } from "@/lib/profiles/queries";
import { ReelForm } from "./reel-form";

export const metadata = { title: "New reel · Bono" };

export default function NewReelPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-bold">New reel</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <NewReel />
      </Suspense>
    </main>
  );
}

async function NewReel() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "nonprofit") redirect("/reels");
  const profile = await getNonprofitProfile(session.user.id);
  if (!profile) redirect("/onboarding");
  if (!profile.verifiedAt) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Reels open once your nonprofit is verified.{" "}
        <Link href="/verify" className="font-semibold underline">
          Get verified
        </Link>
      </p>
    );
  }
  return <ReelForm causes={profile.causes.map((c) => ({ value: c.slug, label: c.label }))} />;
}
