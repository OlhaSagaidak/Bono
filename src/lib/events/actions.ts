"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCauses, eventRsvps, events, nonprofitCauses, nonprofitProfiles } from "@/db/schema";
import { formText, type FormState } from "@/lib/forms";
import { applyPhotoChange, checkUploadedImage, fitImage, type PhotoChange } from "@/lib/images";
import { eventSchema } from "./validation";

// Events: verified nonprofits create, edit and cancel them; anyone signed in
// responds Interested or Going. Every action re-checks who is calling.

async function verifiedNonprofit(): Promise<string | null> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "nonprofit") return null;
  const profile = await db.query.nonprofitProfiles.findFirst({
    where: eq(nonprofitProfiles.userId, session.user.id),
    columns: { verifiedAt: true },
  });
  return profile?.verifiedAt ? session.user.id : null;
}

/** Creates an event, or updates one (hidden eventId) that the caller hosts. */
export async function saveEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const nonprofitId = await verifiedNonprofit();
  if (!nonprofitId) return { error: "Only verified nonprofits can host events." };

  const eventId = formText(formData, "eventId");
  const existing = eventId
    ? await db.query.events.findFirst({ where: and(eq(events.id, eventId), eq(events.nonprofitId, nonprofitId)) })
    : null;
  if (eventId && !existing) return { error: "That event wasn't found." };
  if (existing?.status === "cancelled") return { error: "This event is cancelled and can't be edited." };

  const values = {
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    startsAt: formText(formData, "startsAt"),
    endsAt: formText(formData, "endsAt"),
    locationType: formText(formData, "locationType"),
    address: formText(formData, "address"),
    onlineUrl: formText(formData, "onlineUrl"),
    capacity: formText(formData, "capacity"),
    causes: formData.getAll("causes").map(String),
  };
  const parsed = eventSchema.safeParse(values);
  const fieldErrors: Record<string, string[] | undefined> = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;

  // A new event must start in the future; an edit may keep a start that has passed.
  if (parsed.success && !existing && parsed.data.startsAt.getTime() < Date.now()) {
    fieldErrors.startsAt = ["Choose a start time in the future."];
  }

  // Cover image: optional, resized like post images, removable.
  const upload = await checkUploadedImage(formData.get("cover"));
  let cover: PhotoChange = formData.get("removeCover") === "on" ? { kind: "remove" } : { kind: "keep" };
  if (upload.kind === "error") fieldErrors.cover = [upload.message];
  if (upload.kind === "ok") {
    const resized = await fitImage(upload).catch(() => null);
    if (resized) cover = { kind: "replace", image: resized };
    else fieldErrors.cover = ["That image couldn't be read. Try another one."];
  }
  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  // Events may only use the nonprofit's own causes, like its posts.
  const own = new Set(
    (await db.select({ slug: nonprofitCauses.causeSlug }).from(nonprofitCauses).where(eq(nonprofitCauses.nonprofitId, nonprofitId))).map(
      (r) => r.slug,
    ),
  );
  if (parsed.data.causes.some((c) => !own.has(c))) return { error: "Tag the event with your organization's own causes.", values };

  const { causes, locationType, address, onlineUrl, ...fields } = parsed.data;
  const row = {
    ...fields,
    locationType,
    // Keep only the location that applies.
    address: locationType === "in_person" ? address : null,
    onlineUrl: locationType === "online" ? onlineUrl : null,
  };
  const id = await db.transaction(async (tx) => {
    const coverImageId = await applyPhotoChange(tx, nonprofitId, cover, existing?.coverImageId ?? null);
    let id = existing?.id;
    if (id) {
      await tx.update(events).set({ ...row, coverImageId }).where(eq(events.id, id));
    } else {
      [{ id }] = await tx.insert(events).values({ ...row, coverImageId, nonprofitId }).returning({ id: events.id });
    }
    await tx.delete(eventCauses).where(eq(eventCauses.eventId, id!));
    await tx.insert(eventCauses).values(causes.map((causeSlug) => ({ eventId: id!, causeSlug })));
    return id!;
  });

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}

export async function cancelEventAction(eventId: string): Promise<{ error?: string }> {
  const nonprofitId = await verifiedNonprofit();
  if (!nonprofitId) return { error: "Only the organizer can cancel this event." };
  if (!z.uuid().safeParse(eventId).success) return { error: "That event wasn't found." };
  const [cancelled] = await db
    .update(events)
    .set({ status: "cancelled" })
    .where(and(eq(events.id, eventId), eq(events.nonprofitId, nonprofitId), eq(events.status, "scheduled")))
    .returning({ id: events.id });
  if (!cancelled) return { error: "That event wasn't found or is already cancelled." };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return {};
}

/** Interested, Going, or clear (null). "Going" respects the event's capacity. */
export async function rsvpAction(eventId: string, status: "interested" | "going" | null): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "Log in to respond to events." };
  if (!z.uuid().safeParse(eventId).success || !(status === null || status === "interested" || status === "going")) {
    return { error: "That event wasn't found." };
  }
  const userId = session.user.id;

  const result = await db.transaction(async (tx) => {
    // Lock the event so two people can't take the last spot at the same moment.
    const [event] = await tx
      .select({ nonprofitId: events.nonprofitId, status: events.status, endsAt: events.endsAt, capacity: events.capacity, verifiedAt: nonprofitProfiles.verifiedAt })
      .from(events)
      .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, events.nonprofitId))
      .where(eq(events.id, eventId))
      .for("update", { of: events });
    if (!event || !event.verifiedAt) return "That event wasn't found.";
    if (event.nonprofitId === userId) return "You're hosting this event.";
    if (status !== null && event.status === "cancelled") return "This event was cancelled.";
    if (status !== null && event.endsAt.getTime() < Date.now()) return "This event is over.";

    if (status === null) {
      await tx.delete(eventRsvps).where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
      return null;
    }
    if (status === "going" && event.capacity !== null) {
      const [{ going }] = await tx
        .select({ going: sql<number>`count(*)::int` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "going"), sql`${eventRsvps.userId} <> ${userId}`));
      if (going >= event.capacity) return "This event is full. You can still mark yourself Interested.";
    }
    await tx
      .insert(eventRsvps)
      .values({ eventId, userId, status })
      .onConflictDoUpdate({ target: [eventRsvps.eventId, eventRsvps.userId], set: { status } });
    return null;
  });

  if (result) return { error: result };
  revalidatePath(`/events/${eventId}`);
  return {};
}
