import { Suspense } from "react";
import { ProfileEditor } from "../../onboarding/profile-editor";

export const metadata = { title: "Edit profile · Bono" };

// Only ever edits the signed-in account; the Server Actions check that too.
export default function EditProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <ProfileEditor mode="edit" />
      </Suspense>
    </main>
  );
}
