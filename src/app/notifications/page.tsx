import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications/queries";
import { NotificationList } from "./notification-list";

export const metadata = { title: "Notifications · Bono" };

export default function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading notifications…</p>}>
        <Notifications searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Notifications({ searchParams }: { searchParams: PageProps<"/notifications">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const { before } = await searchParams;
  const cursor = z.uuid().safeParse(before);
  const { items, nextBefore } = await listNotifications(session.user.id, { before: cursor.success ? cursor.data : undefined });

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {cursor.success ? "No older notifications." : "No notifications yet. Follow organizations and respond to events to hear what's new."}
      </div>
    );
  }
  return (
    <>
      <NotificationList items={items} />
      {nextBefore && (
        <Link
          href={`/notifications?before=${nextBefore}`}
          className="self-center rounded-lg px-4 py-2 font-medium text-emerald-700 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:text-emerald-400 dark:hover:bg-zinc-800"
        >
          Older notifications
        </Link>
      )}
    </>
  );
}
