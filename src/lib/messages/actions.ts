"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { blocks, conversationMembers, conversations, messages, reports, users } from "@/db/schema";
import { LIMITS, overLimit } from "@/lib/guards/rate-limit";
import { notify } from "@/lib/notifications/notify";
import { getConversation, MESSAGE_MAX, messagingProblem, type MessageView } from "./queries";

const uuid = z.uuid();

/** Opens the conversation with this person, creating it the first time. */
export async function startConversationAction(otherId: string): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (!uuid.safeParse(otherId).success) redirect("/messages");
  const viewerId = session.user.id;
  const { other, problem } = await messagingProblem(viewerId, otherId);
  // Blocked people can still open an existing conversation (to unblock); others
  // who can't be messaged just land on the inbox.
  if (!other) redirect("/messages");

  const [userLow, userHigh] = [viewerId, otherId].sort();
  const existing = await db.query.conversations.findFirst({
    where: and(eq(conversations.userLow, userLow), eq(conversations.userHigh, userHigh)),
    columns: { id: true },
  });
  if (!existing && problem) redirect("/messages");
  let id = existing?.id;
  if (!id) {
    id = await db.transaction(async (tx) => {
      // Two people clicking "Message" at once both end up in the same conversation.
      await tx.insert(conversations).values({ userLow, userHigh }).onConflictDoNothing();
      const [c] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.userLow, userLow), eq(conversations.userHigh, userHigh)));
      await tx
        .insert(conversationMembers)
        .values([{ conversationId: c.id, userId: viewerId }, { conversationId: c.id, userId: otherId }])
        .onConflictDoNothing();
      return c.id;
    });
  }
  redirect(`/messages/${id}`);
}

export async function sendMessageAction(conversationId: string, body: string): Promise<{ message: MessageView } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Log in to send messages." };
  if (!uuid.safeParse(conversationId).success) return { error: "That conversation wasn't found." };
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return { error: "Write a message first." };
  if (text.length > MESSAGE_MAX) return { error: `Messages can be up to ${MESSAGE_MAX} characters.` };

  const viewerId = session.user.id;
  const conversation = await getConversation(conversationId, viewerId);
  if (!conversation) return { error: "That conversation wasn't found." };
  if (conversation.problem) return { error: conversation.problem };
  if (await overLimit(sql`${messages}`, sql`sender_id = ${viewerId}`, sql`created_at`, LIMITS.messages)) return { error: LIMITS.messages.message };

  const message = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(messages)
      .values({ conversationId, senderId: viewerId, body: text })
      .returning({ id: messages.id, senderId: messages.senderId, body: messages.body, createdAt: messages.createdAt });
    await tx.update(conversations).set({ lastMessageAt: m.createdAt }).where(eq(conversations.id, conversationId));
    // Sending means you've seen everything before it.
    await tx
      .update(conversationMembers)
      .set({ lastReadAt: m.createdAt })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, viewerId)));
    return m;
  });

  // One notification per conversation, moved back to the top by each new message.
  await notify([conversation.other.id], { type: "message", actorId: viewerId, targetId: conversationId, key: conversationId, repeat: "bump" });
  revalidatePath("/messages");
  return { message: { ...message, createdAt: message.createdAt.toISOString() } };
}

export async function setBlockedAction(otherId: string, blocked: boolean): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "Log in first." };
  if (!uuid.safeParse(otherId).success || otherId === session.user.id) return { error: "That person wasn't found." };
  if (!(await db.query.users.findFirst({ where: eq(users.id, otherId), columns: { id: true } }))) return { error: "That person wasn't found." };
  if (blocked) {
    await db.insert(blocks).values({ blockerId: session.user.id, blockedId: otherId }).onConflictDoNothing();
  } else {
    await db.delete(blocks).where(and(eq(blocks.blockerId, session.user.id), eq(blocks.blockedId, otherId)));
  }
  revalidatePath("/messages", "layout");
  return {};
}

const REASON_MAX = 500;

export async function reportAction(conversationId: string, reason: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "Log in first." };
  if (!uuid.safeParse(conversationId).success) return { error: "That conversation wasn't found." };
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return { error: "Tell us briefly what's wrong." };
  if (text.length > REASON_MAX) return { error: `Keep it under ${REASON_MAX} characters.` };
  const conversation = await getConversation(conversationId, session.user.id);
  if (!conversation) return { error: "That conversation wasn't found." };
  // One report per person and conversation is enough.
  const already = await db.query.reports.findFirst({
    where: and(eq(reports.reporterId, session.user.id), eq(reports.conversationId, conversationId)),
    columns: { id: true },
  });
  if (!already) {
    await db.insert(reports).values({ reporterId: session.user.id, reportedId: conversation.other.id, conversationId, reason: text });
  }
  return {};
}
