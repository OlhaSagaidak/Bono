import "server-only";
import { and, count, desc, eq, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { blocks, conversationMembers, conversations, messages, nonprofitProfiles, sponsorProfiles, users } from "@/db/schema";

// Reading conversations. Every function that takes a conversation id also
// takes the viewer, and returns nothing unless the viewer is one of its two
// members: that is the "only participants can read it" rule.

export const MESSAGE_MAX = 2000;
const HISTORY = 100; // messages loaded when a conversation opens

/** Who someone is, for messaging: their display name and photo (logo for organizations). */
async function person(userId: string) {
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      name: sql<string>`coalesce(${nonprofitProfiles.name}, ${sponsorProfiles.name}, ${users.name})`,
      photoImageId: sql<string | null>`coalesce(${nonprofitProfiles.logoImageId}, ${sponsorProfiles.logoImageId}, ${users.avatarImageId})`,
      // Only nonprofits can be unverified; everyone else counts as visible.
      visible: sql<boolean>`(${users.role} <> 'nonprofit' or ${nonprofitProfiles.verifiedAt} is not null)`,
      onboarded: sql<boolean>`${users.onboardedAt} is not null`,
    })
    .from(users)
    .leftJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, users.id))
    .leftJoin(sponsorProfiles, eq(sponsorProfiles.userId, users.id))
    .where(eq(users.id, userId));
  return row ?? null;
}
export type Person = NonNullable<Awaited<ReturnType<typeof person>>>;

export async function blockState(viewerId: string, otherId: string) {
  const rows = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, otherId)),
        and(eq(blocks.blockerId, otherId), eq(blocks.blockedId, viewerId)),
      ),
    );
  return { iBlocked: rows.some((r) => r.blockerId === viewerId), theyBlocked: rows.some((r) => r.blockerId === otherId) };
}

/**
 * Whether the viewer may message this person, and if not, a reason to show.
 * Unverified nonprofits stay invisible (the safe-space rule), so they can
 * neither be messaged nor send messages.
 */
export async function messagingProblem(viewerId: string, otherId: string): Promise<{ other: Person | null; problem: string | null }> {
  if (viewerId === otherId) return { other: null, problem: "You can't message yourself." };
  const [me, other] = await Promise.all([person(viewerId), person(otherId)]);
  if (!other || !other.visible || !other.onboarded) return { other: null, problem: "That person wasn't found." };
  if (!me?.visible) return { other, problem: "Your organization can send messages once it's verified." };
  const { iBlocked, theyBlocked } = await blockState(viewerId, otherId);
  if (iBlocked) return { other, problem: `You blocked ${other.name}. Unblock them to send messages.` };
  if (theyBlocked) return { other, problem: "You can't message this person." };
  return { other, problem: null };
}

const otherOf = (viewerId: string) =>
  sql`case when ${conversations.userLow} = ${viewerId} then ${conversations.userHigh} else ${conversations.userLow} end`;

/** A conversation the viewer is part of, with the other person; null otherwise. */
export async function getConversation(conversationId: string, viewerId: string) {
  const [row] = await db
    .select({ id: conversations.id, otherId: otherOf(viewerId).mapWith(String) })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), or(eq(conversations.userLow, viewerId), eq(conversations.userHigh, viewerId))));
  if (!row) return null;
  const { other, problem } = await messagingProblem(viewerId, row.otherId);
  // A conversation with someone who has since become invisible isn't shown.
  if (!other) return null;
  return { id: row.id, other, problem };
}

export type MessageView = { id: string; senderId: string; body: string; imageId: string | null; createdAt: string };

const toView = (m: { id: string; senderId: string; body: string; imageId: string | null; createdAt: Date }): MessageView => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
});

/** The latest messages, oldest first; or, with `afterId`, only the ones newer than it. Members only. */
export async function getMessages(conversationId: string, viewerId: string, afterId?: string): Promise<MessageView[] | null> {
  const member = await db.query.conversationMembers.findFirst({
    where: and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, viewerId)),
    columns: { userId: true },
  });
  if (!member) return null;
  const filters: SQL[] = [eq(messages.conversationId, conversationId)];
  if (afterId) {
    filters.push(sql`(${messages.createdAt}, ${messages.id}) > (select created_at, id from ${messages} where id = ${afterId} and conversation_id = ${conversationId})`);
  }
  const rows = await db
    .select({ id: messages.id, senderId: messages.senderId, body: messages.body, imageId: messages.imageId, createdAt: messages.createdAt })
    .from(messages)
    .where(and(...filters))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(HISTORY);
  return rows.reverse().map(toView);
}

/** Conversations with at least one message, most recent first, with the other person and an unread flag. */
export async function getInbox(viewerId: string, limit = 50) {
  const me = alias(conversationMembers, "me");
  const other = alias(users, "other");
  const latest = (column: string) =>
    sql.raw(`(select ${column} from messages m where m.conversation_id = "conversations"."id" order by m.created_at desc, m.id desc limit 1)`);
  return db
    .select({
      id: conversations.id,
      lastMessageAt: conversations.lastMessageAt,
      other: {
        id: other.id,
        name: sql<string>`coalesce(${nonprofitProfiles.name}, ${sponsorProfiles.name}, ${other.name})`,
        photoImageId: sql<string | null>`coalesce(${nonprofitProfiles.logoImageId}, ${sponsorProfiles.logoImageId}, ${other.avatarImageId})`,
      },
      // A photo with no text shows as "📷 Photo" in the inbox.
      lastBody: sql<string>`${latest("case when m.body = '' then '📷 Photo' else m.body end")}`,
      lastFromMe: sql<boolean>`${latest("m.sender_id")} = ${viewerId}`,
      unread: sql<boolean>`exists (select 1 from ${messages} m where m.conversation_id = ${conversations.id} and m.sender_id <> ${viewerId} and m.created_at > ${me.lastReadAt})`,
    })
    .from(conversations)
    .innerJoin(me, and(eq(me.conversationId, conversations.id), eq(me.userId, viewerId)))
    .innerJoin(other, eq(other.id, otherOf(viewerId)))
    .leftJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, other.id))
    .leftJoin(sponsorProfiles, eq(sponsorProfiles.userId, other.id))
    .where(and(isNotNull(conversations.lastMessageAt), sql`(${other.role} <> 'nonprofit' or ${nonprofitProfiles.verifiedAt} is not null)`))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);
}
export type InboxItem = Awaited<ReturnType<typeof getInbox>>[number];

/** How many conversations have messages the viewer hasn't read: the Messages badge. */
export async function unreadConversationCount(viewerId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.userId, viewerId),
        sql`exists (select 1 from ${messages} m where m.conversation_id = ${conversationMembers.conversationId} and m.sender_id <> ${viewerId} and m.created_at > ${conversationMembers.lastReadAt})`,
      ),
    );
  return row.n;
}
