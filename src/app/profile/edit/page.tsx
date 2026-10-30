import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { getAccount } from "@/lib/profiles/queries";
import { ProfileEditor } from "../../onboarding/profile-editor";
import { BadgeSetting } from "./badge-setting";

export const metadata = { title: "Edit profile · Bono" };

// Only ever edits the signed-in account; the Server Actions check that too.
export default function EditProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <ProfileEditor mode="edit" />
        <Badges />
      </Suspense>
    </main>
  );
}

/** Supporters and sponsors earn badges; nonprofits are the ones being backed. */
async function Badges() {
  const session = await getSession();
  if (!session || session.user.role === "nonprofit") return null;
  const account = await getAccount(session.user.id);
  return account ? <BadgeSetting initial={account.showBadges} /> : null;
}
