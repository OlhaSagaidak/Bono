"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";

// Only the recipient can mark their notifications read: every update is
// scoped to the signed-in user.

export async function markNotificationReadAction(id: string): Promise<void> {
  const session = await auth();
  if (!session || !z.uuid().safeParse(id).success) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, session.user.id), isNull(notifications.readAt)));
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await auth();
  if (!session) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, session.user.id), isNull(notifications.readAt)));
}
