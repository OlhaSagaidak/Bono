import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { MessagesShell } from "./shell";

export const metadata = { title: "Messages · Bono" };

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-zinc-600 dark:text-zinc-400">Loading messages…</p>}>
      <Inbox />
    </Suspense>
  );
}

async function Inbox() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");
  return (
    <main className="contents">
      <MessagesShell viewerId={session.user.id}>
        <p className="m-auto p-6 text-center text-zinc-600 dark:text-zinc-400">Choose a conversation to read it.</p>
      </MessagesShell>
    </main>
  );
}
