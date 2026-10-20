import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Avatar } from "@/components/avatar";
import { getSession } from "@/lib/auth/session";
import { blockState, getConversation, getMessages } from "@/lib/messages/queries";
import { profilePath } from "@/lib/profiles/paths";
import { Chat } from "../chat";
import { ConversationMenu } from "../conversation-menu";
import { MessagesShell } from "../shell";

export default function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-zinc-600 dark:text-zinc-400">Loading conversation…</p>}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: Pick<PageProps<"/messages/[id]">, "params">) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const viewerId = session.user.id;

  // Only the two people in it can open it; for anyone else it doesn't exist.
  const conversation = await getConversation(id, viewerId);
  if (!conversation) notFound();
  const [history, blocked] = await Promise.all([getMessages(id, viewerId), blockState(viewerId, conversation.other.id)]);
  const { other } = conversation;

  return (
    <main className="contents">
      <title>{`${other.name} · Messages · Bono`}</title>
      <MessagesShell viewerId={viewerId} selectedId={id}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/messages" className="rounded-lg px-1 text-sm font-medium text-emerald-700 focus:outline-2 focus:outline-emerald-600 lg:hidden dark:text-emerald-400">
              ← <span className="sr-only">All messages</span>
            </Link>
            <Avatar name={other.name} imageId={other.photoImageId} />
            <h2 className="truncate font-semibold">
              <Link href={profilePath(other.role, other.id)} className="hover:underline focus:outline-2 focus:outline-emerald-600">
                {other.name}
              </Link>
            </h2>
          </div>
          <ConversationMenu conversationId={id} otherId={other.id} otherName={other.name} iBlocked={blocked.iBlocked} />
        </header>
        <Chat key={id} conversationId={id} viewerId={viewerId} otherName={other.name} initial={history ?? []} problem={conversation.problem} />
      </MessagesShell>
    </main>
  );
}
