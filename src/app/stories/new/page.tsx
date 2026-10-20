import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { getNonprofitProfile } from "@/lib/profiles/queries";
import { StoryForm } from "./story-form";

export const metadata = { title: "New story · Bono" };

export default function NewStoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-bold">New story</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <NewStory />
      </Suspense>
    </main>
  );
}

async function NewStory() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "nonprofit") redirect("/feed");
  const profile = await getNonprofitProfile(session.user.id);
  if (!profile) redirect("/onboarding");
  if (!profile.verifiedAt) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Stories open once your nonprofit is verified.{" "}
        <Link href="/verify" className="font-semibold underline">
          Get verified
        </Link>
      </p>
    );
  }
  return <StoryForm nonprofitId={session.user.id} />;
}
