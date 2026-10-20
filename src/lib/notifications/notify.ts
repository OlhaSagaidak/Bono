import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, type NotificationType } from "@/db/schema";

// The one way features create notifications. Each notification has a group
// key (type + what it's about), so the same thing never piles up:
//   "once": a repeat is ignored (a follow, a reminder, a cancellation).
//   "bump": a repeat moves the existing one back to the top as unread (likes
//           on a post, an event changed again). Grouped likes count from
//           sinceAt, which restarts once the previous batch was read.
// Nobody is notified about their own actions, and a failure here is logged
// but never breaks the action that caused it.

export type Notice = {
  type: NotificationType;
  actorId: string;
  targetId: string | null;
  /** What makes two notices "the same thing", e.g. the post id for likes. */
  key: string;
  repeat: "once" | "bump";
  /** For grouped likes: when the like happened. */
  at?: Date;
};

export async function notify(recipientIds: string[], notice: Notice): Promise<void> {
  const recipients = [...new Set(recipientIds)].filter((id) => id !== notice.actorId);
  if (recipients.length === 0) return;
  const rows = recipients.map((recipientId) => ({
    recipientId,
    type: notice.type,
    actorId: notice.actorId,
    targetId: notice.targetId,
    groupKey: `${notice.type}:${notice.key}`,
    ...(notice.at ? { sinceAt: notice.at } : {}),
  }));
  try {
    const insert = db.insert(notifications).values(rows);
    if (notice.repeat === "once") {
      await insert.onConflictDoNothing({ target: [notifications.recipientId, notifications.groupKey] });
    } else {
      await insert.onConflictDoUpdate({
        target: [notifications.recipientId, notifications.groupKey],
        set: {
          actorId: sql`excluded.actor_id`,
          createdAt: sql`now()`,
          readAt: null,
          // Still unread: keep counting from the same start. Already read: start a new batch.
          sinceAt: sql`case when ${notifications.readAt} is null then ${notifications.sinceAt} else excluded.since_at end`,
        },
      });
    }
  } catch (error) {
    console.error(`Couldn't create ${notice.type} notifications`, error);
  }
}
