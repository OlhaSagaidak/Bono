import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversationMembers, images, messages } from "@/db/schema";

export async function GET(_req: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });

  const image = await db.query.images.findFirst({ where: eq(images.id, id) });
  if (!image) return new Response("Not found", { status: 404 });

  // Photos sent in messages are private: only the two people in that
  // conversation get them (everyone else gets the same "not found").
  const [inMessage] = await db.select({ conversationId: messages.conversationId }).from(messages).where(eq(messages.imageId, id)).limit(1);
  if (inMessage) {
    const session = await auth();
    const member =
      session &&
      (await db.query.conversationMembers.findFirst({
        where: and(eq(conversationMembers.conversationId, inMessage.conversationId), eq(conversationMembers.userId, session.user.id)),
        columns: { userId: true },
      }));
    if (!member) return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      // A replaced image gets a new id, so a given URL never changes content.
      // Private photos may only be kept by the viewer's own browser.
      "Cache-Control": `${inMessage ? "private" : "public"}, max-age=31536000, immutable`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
