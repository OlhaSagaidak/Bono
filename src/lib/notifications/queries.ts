import "server-only";
import { and, count, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { eventRsvps, events, nonprofitProfiles, notifications, postLikes, posts, sponsorProfiles, users } from "@/db/schema";
import { describe, type NotificationRow, type NotificationView } from "./describe";

export const NOTIFICATIONS_PAGE_SIZE = 30;
const EVENT_TYPES = ["rsvp", "event_new", "event_soon", "event_cancelled", "event_changed"] as const;

/**
 * "Your event starts within 24 hours" reminders. There's no scheduler on the
 * free plan, so they're created when someone's unread count is checked
 * (the top bar polls it). The group key makes each one appear only once.
 */
async function createDueReminders(userId: string): Promise<void> {
  await db.execute(sql`
    insert into ${notifications} (recipient_id, type, actor_id, target_id, group_key)
    select r.user_id, 'event_soon', e.nonprofit_id, e.id, 'event_soon:' || e.id
    from ${eventRsvps} r
    join ${events} e on e.id = r.event_id
    where r.user_id = ${userId}
      and e.status = 'scheduled'
      and e.starts_at > now()
      and e.starts_at <= now() + interval '24 hours'
    on conflict (recipient_id, group_key) do nothing`);
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  await createDueReminders(userId);
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  return row.n;
}

/** Newest first; `before` is the id of the last notification on the previous page. */
export async function listNotifications(
  userId: string,
  { limit = NOTIFICATIONS_PAGE_SIZE, before }: { limit?: number; before?: string } = {},
): Promise<{ items: NotificationView[]; nextBefore: string | null }> {
  const actor = alias(users, "actor");
  const filters: SQL[] = [eq(notifications.recipientId, userId)];
  if (before) {
    filters.push(
      sql`(${notifications.createdAt}, ${notifications.id}) < (select created_at, id from ${notifications} where id = ${before} and recipient_id = ${userId})`,
    );
  }

  const rows: NotificationRow[] = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      targetId: notifications.targetId,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      actorId: notifications.actorId,
      actorName: sql<string | null>`coalesce(${nonprofitProfiles.name}, ${sponsorProfiles.name}, ${actor.name})`,
      actorRole: actor.role,
      // A supporter's own photo; nonprofits and sponsors show their logo.
      actorPhotoId: sql<string | null>`coalesce(${nonprofitProfiles.logoImageId}, ${sponsorProfiles.logoImageId}, ${actor.avatarImageId})`,
      eventTitle: events.title,
      eventStartsAt: events.startsAt,
      postBody: posts.body,
      likeCount: sql<number>`case when ${notifications.type} = 'post_likes'
        then (select count(*) from ${postLikes} l where l.post_id = ${notifications.targetId} and l.created_at >= ${notifications.sinceAt})
        else 0 end::int`,
      rsvpStatus: sql<"interested" | "going" | null>`case when ${notifications.type} = 'rsvp'
        then (select r.status::text from ${eventRsvps} r where r.event_id = ${notifications.targetId} and r.user_id = ${notifications.actorId}) end`,
    })
    .from(notifications)
    .leftJoin(actor, eq(actor.id, notifications.actorId))
    .leftJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, notifications.actorId))
    .leftJoin(sponsorProfiles, eq(sponsorProfiles.userId, notifications.actorId))
    .leftJoin(events, and(eq(events.id, notifications.targetId), inArray(notifications.type, [...EVENT_TYPES])))
    .leftJoin(posts, and(eq(posts.id, notifications.targetId), eq(notifications.type, "post_likes")))
    .where(and(...filters))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  return { items: page.map(describe), nextBefore: rows.length > limit ? page.at(-1)!.id : null };
}
