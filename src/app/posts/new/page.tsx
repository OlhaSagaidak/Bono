import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { getNonprofitProfile } from "@/lib/profiles/queries";
import { PostForm } from "./post-form";

export const metadata = { title: "New post · Bono" };

export default function NewPostPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-bold">New post</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <NewPost />
      </Suspense>
    </main>
  );
}

async function NewPost() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "nonprofit") redirect("/feed");
  const profile = await getNonprofitProfile(session.user.id);
  if (!profile) redirect("/onboarding");
  if (!profile.verifiedAt) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Posting opens once your nonprofit is verified. Bono only shows supporters organizations whose
        EIN has been checked, so everyone can give without second-guessing.
      </p>
    );
  }

  return <PostForm causes={profile.causes.map((c) => ({ value: c.slug, label: c.label }))} />;
}
