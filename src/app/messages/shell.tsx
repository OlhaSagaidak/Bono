import { InboxList } from "@/components/inbox-list";
import { getInbox } from "@/lib/messages/queries";

/**
 * Inbox on the left, the open conversation on the right. On phones only one
 * shows at a time: the inbox at /messages, the conversation at /messages/[id].
 */
export async function MessagesShell({ viewerId, selectedId, children }: { viewerId: string; selectedId?: string; children: React.ReactNode }) {
  const inbox = await getInbox(viewerId);
  return (
    <div className="mx-auto grid h-[calc(100dvh-3.75rem)] w-full max-w-5xl flex-1 gap-4 px-4 py-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <section aria-labelledby="inbox-heading" className={`min-h-0 flex-col gap-2 overflow-y-auto ${selectedId ? "hidden lg:flex" : "flex"}`}>
        <h1 id="inbox-heading" className="px-2 text-2xl font-bold">
          Messages
        </h1>
        {inbox.length === 0 ? (
          <p className="px-2 text-sm text-zinc-600 dark:text-zinc-400">
            No conversations yet. Open a nonprofit, sponsor or supporter profile and press <strong>Message</strong> to start one.
          </p>
        ) : (
          <InboxList items={inbox} selectedId={selectedId} />
        )}
      </section>
      <div className={`min-h-0 flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 ${selectedId ? "flex" : "hidden lg:flex"}`}>{children}</div>
    </div>
  );
}
