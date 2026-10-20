import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversationMembers, notifications } from "@/db/schema";
import { getMessages } from "@/lib/messages/queries";

// Polled every few seconds while a conversation is open: returns messages
// newer than `after`, and marks the conversation (and its notification) read.
// Only the two members get anything back.
export async function GET(request: Request, ctx: RouteContext<"/api/messages/[id]">) {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const after = new URL(request.url).searchParams.get("after");
  if (!z.uuid().safeParse(id).success || (after && !z.uuid().safeParse(after).success)) return new Response(null, { status: 400 });

  const list = await getMessages(id, session.user.id, after ?? undefined);
  if (!list) return new Response(null, { status: 404 });
  await markRead(id, session.user.id);
  return Response.json({ messages: list }, { headers: { "Cache-Control": "no-store" } });
}

async function markRead(conversationId: string, userId: string) {
  // The database's clock, which keeps microseconds like the message times do.
  await db
    .update(conversationMembers)
    .set({ lastReadAt: sql`now()` })
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)));
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.recipientId, userId), eq(notifications.groupKey, `message:${conversationId}`)));
}
