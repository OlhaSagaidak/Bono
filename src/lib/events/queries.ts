import "server-only";
import { and, asc, desc, eq, gt, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { causes, eventCauses, eventRsvps, events, follows, nonprofitProfiles, users } from "@/db/schema";

// What an event card or page needs. Counts and the viewer's own response are
// subqueries, so one query serves every list.
const cardColumns = (viewerId: string | null) => ({
  id: events.id,
  title: events.title,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  locationType: events.locationType,
  address: events.address,
  status: events.status,
  coverImageId: events.coverImageId,
  capacity: events.capacity,
  nonprofit: { id: nonprofitProfiles.userId, name: nonprofitProfiles.name, logoImageId: nonprofitProfiles.logoImageId },
  going: sql<number>`(select count(*) from ${eventRsvps} r where r.event_id = ${events.id} and r.status = 'going')::int`,
  interested: sql<number>`(select count(*) from ${eventRsvps} r where r.event_id = ${events.id} and r.status = 'interested')::int`,
  viewerStatus: viewerId
    ? sql<"interested" | "going" | null>`(select r.status::text from ${eventRsvps} r where r.event_id = ${events.id} and r.user_id = ${viewerId})`
    : sql<null>`null`,
});

export type EventCard = Awaited<ReturnType<typeof upcomingEvents>>[number];

const visible = () => isNotNull(nonprofitProfiles.verifiedAt); // the safe-space rule
const notOver = () => gt(events.endsAt, sql`now()`); // past events drop out

/** Upcoming events: followed organizations first, then everyone else; optionally one cause. */
export function upcomingEvents(viewerId: string, causeSlug?: string) {
  const filters: (SQL | undefined)[] = [visible(), notOver(), eq(events.status, "scheduled")];
  if (causeSlug) filters.push(sql`exists (select 1 from ${eventCauses} ec where ec.event_id = ${events.id} and ec.cause_slug = ${causeSlug})`);
  return db
    .select(cardColumns(viewerId))
    .from(events)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, events.nonprofitId))
    .where(and(...filters))
    .orderBy(
      desc(sql`exists (select 1 from ${follows} f where f.follower_id = ${viewerId} and f.nonprofit_id = ${events.nonprofitId})`),
      asc(events.startsAt),
    )
    .limit(50);
}

/** Events I responded to that aren't over yet, including cancelled ones (shown as cancelled). */
export function myEvents(viewerId: string, limit = 50) {
  return db
    .select(cardColumns(viewerId))
    .from(eventRsvps)
    .innerJoin(events, eq(events.id, eventRsvps.eventId))
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, events.nonprofitId))
    .where(and(eq(eventRsvps.userId, viewerId), visible(), notOver()))
    .orderBy(asc(events.startsAt))
    .limit(limit);
}

/** Right sidebar: my next scheduled events. */
export function nextEventsFor(viewerId: string, limit = 5) {
  return db
    .select(cardColumns(viewerId))
    .from(eventRsvps)
    .innerJoin(events, eq(events.id, eventRsvps.eventId))
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, events.nonprofitId))
    .where(and(eq(eventRsvps.userId, viewerId), visible(), notOver(), eq(events.status, "scheduled")))
    .orderBy(asc(events.startsAt))
    .limit(limit);
}

/** A nonprofit's own events: upcoming first (soonest first), then past (latest first). */
export function hostedEvents(nonprofitId: string, viewerId: string | null, options: { upcomingOnly?: boolean } = {}) {
  return db
    .select(cardColumns(viewerId))
    .from(events)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, events.nonprofitId))
    .where(and(eq(events.nonprofitId, nonprofitId), options.upcomingOnly ? and(notOver(), eq(events.status, "scheduled")) : undefined))
    .orderBy(desc(sql`${events.endsAt} > now()`), sql`case when ${events.endsAt} > now() then ${events.startsAt} end asc`, desc(events.startsAt))
    .limit(50);
}

/** One event with everything its page shows. Attendee lists only for its organizer. */
export async function getEvent(id: string, viewerId: string | null) {
  const [event] = await db
    .select({
      ...cardColumns(viewerId),
      description: events.description,
      onlineUrl: events.onlineUrl,
      verified: sql<boolean>`${nonprofitProfiles.verifiedAt} is not null`,
    })
    .from(events)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, events.nonprofitId))
    .where(eq(events.id, id));
  if (!event) return null;
  const tags = await db
    .select({ slug: causes.slug, label: causes.label })
    .from(eventCauses)
    .innerJoin(causes, eq(causes.slug, eventCauses.causeSlug))
    .where(eq(eventCauses.eventId, id))
    .orderBy(asc(causes.sortOrder));
  const isOrganizer = viewerId === event.nonprofit.id;
  const attendees = isOrganizer
    ? await db
        .select({ id: users.id, name: users.name, role: users.role, status: eventRsvps.status })
        .from(eventRsvps)
        .innerJoin(users, eq(users.id, eventRsvps.userId))
        .where(eq(eventRsvps.eventId, id))
        .orderBy(asc(users.name))
    : null;
  return { ...event, causes: tags, isOrganizer, attendees };
}
