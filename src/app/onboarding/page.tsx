import { Suspense } from "react";
import { ProfileEditor } from "./profile-editor";

export const metadata = { title: "Set up your profile · Bono" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <ProfileEditor mode="setup" />
      </Suspense>
    </main>
  );
}

