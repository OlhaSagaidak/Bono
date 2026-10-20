import type { NotificationType, Role } from "@/db/schema";
import { profilePath } from "@/lib/profiles/paths";

// Turns a stored notification (plus what it points at) into what the bell
// and /notifications show: who, what happened, and where clicking goes.
// Kept free of database code so it's easy to read and test.

export type NotificationRow = {
  id: string;
  type: NotificationType;
  targetId: string | null;
  readAt: Date | null;
  createdAt: Date;
  actorId: string | null;
  actorName: string | null;
  actorRole: Role | null;
  actorPhotoId: string | null;
  eventTitle: string | null;
  eventStartsAt: Date | null;
  postBody: string | null;
  /** post_likes: likes on the post since this batch started. */
  likeCount: number;
  /** rsvp: the actor's current response, if they still have one. */
  rsvpStatus: "interested" | "going" | null;
};

export type NotificationView = {
  id: string;
  unread: boolean;
  createdAt: string; // ISO
  href: string;
  actor: { name: string; photoImageId: string | null } | null;
  /** Shown in bold before the text: usually the actor's name. */
  lead: string | null;
  /** e.g. "liked your post “Adoption day…”". */
  text: string;
  /** An event's start, shown in the viewer's timezone. */
  startsAt?: string;
};

function snippet(text: string, max = 50): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export function describe(row: NotificationRow): NotificationView {
  const event = row.eventTitle ? `“${row.eventTitle}”` : "an event";
  const eventHref = row.targetId ? `/events/${row.targetId}` : "/events";
  const actorHref = row.actorId && row.actorRole ? profilePath(row.actorRole, row.actorId) : "/feed";

  let text: string;
  let lead = row.actorName;
  let href = eventHref;
  switch (row.type) {
    case "follow":
      text = "started following you.";
      href = actorHref;
      break;
    case "rsvp":
      text =
        row.rsvpStatus === "going"
          ? `is going to ${event}.`
          : row.rsvpStatus === "interested"
            ? `is interested in ${event}.`
            : `responded to ${event}.`;
      break;
    case "event_new":
      text = `posted a new event: ${event}.`;
      break;
    case "event_soon":
      lead = "Starts soon:";
      text = `${event}${row.actorName ? ` by ${row.actorName}` : ""} ·`;
      break;
    case "event_cancelled":
      text = `cancelled ${event}.`;
      break;
    case "event_changed":
      text = `changed the time or place of ${event}.`;
      break;
    case "post_likes": {
      const others = Math.max(0, row.likeCount - 1);
      const post = row.postBody ? ` “${snippet(row.postBody)}”` : "";
      text =
        others === 0
          ? `liked your post${post}.`
          : `and ${others} ${others === 1 ? "other" : "others"} liked your post${post}.`;
      href = row.targetId ? `/posts/${row.targetId}` : "/feed";
      break;
    }
    case "story_new":
      text = "posted a new story.";
      // Opens that organization's stories (if they haven't expired yet).
      href = row.targetId ? `/feed?story=${row.targetId}` : "/feed";
      break;
    case "message":
      text = "sent you a message.";
      href = row.targetId ? `/messages/${row.targetId}` : "/messages";
      break;
  }

  return {
    id: row.id,
    unread: row.readAt === null,
    createdAt: row.createdAt.toISOString(),
    href,
    actor: row.actorName ? { name: row.actorName, photoImageId: row.actorPhotoId } : null,
    lead,
    text,
    ...(row.type === "event_soon" && row.eventStartsAt ? { startsAt: row.eventStartsAt.toISOString() } : {}),
  };
}
