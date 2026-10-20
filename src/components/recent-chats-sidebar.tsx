import { InboxList } from "@/components/inbox-list";
import { SidebarEmpty, SidebarSection } from "@/components/sidebar-section";
import { getInbox } from "@/lib/messages/queries";

/** Left sidebar: the five most recent conversations. */
export async function RecentChatsSidebar({ userId }: { userId: string }) {
  const items = await getInbox(userId, 5);
  return (
    <SidebarSection title="Recent chats" href="/messages" linkLabel="Messages">
      {items.length === 0 ? (
        <SidebarEmpty>No conversations yet. Use the Message button on a profile to start one.</SidebarEmpty>
      ) : (
        <InboxList items={items} compact />
      )}
    </SidebarSection>
  );
}
