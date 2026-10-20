import assert from "node:assert/strict";
import { describe as group, it } from "node:test";
import { describe, type NotificationRow } from "@/lib/notifications/describe";

const row = (over: Partial<NotificationRow>): NotificationRow => ({
  id: "n1",
  type: "post_likes",
  targetId: "p1",
  readAt: null,
  createdAt: new Date("2026-10-20T12:00:00Z"),
  actorId: "u1",
  actorName: "Maya Chen",
  actorRole: "user",
  actorPhotoId: null,
  eventTitle: null,
  eventStartsAt: null,
  postBody: null,
  batchCount: 1,
  rsvpStatus: null,
  ...over,
});

group("notification wording", () => {
  it("groups likes: one person, then 'and N others'", () => {
    assert.equal(describe(row({ batchCount: 1 })).text, "liked your post.");
    assert.equal(describe(row({ batchCount: 2 })).text, "and 1 other liked your post.");
    assert.equal(describe(row({ batchCount: 12 })).text, "and 11 others liked your post.");
  });

  it("quotes a short snippet of the post", () => {
    const text = describe(row({ type: "post_comment", postBody: "A".repeat(80) })).text;
    assert.match(text, /^commented on your post “A+…”\.$/);
  });

  it("links follows to the follower's profile, by role", () => {
    assert.equal(describe(row({ type: "follow", actorRole: "user" })).href, "/users/u1");
    assert.equal(describe(row({ type: "follow", actorRole: "sponsor" })).href, "/sponsors/u1");
  });

  it("describes RSVPs by the current response", () => {
    assert.equal(describe(row({ type: "rsvp", eventTitle: "Adoption Day", rsvpStatus: "going" })).text, "is going to “Adoption Day”.");
    assert.equal(describe(row({ type: "rsvp", eventTitle: "Adoption Day", rsvpStatus: null })).text, "responded to “Adoption Day”.");
  });

  it("leads reminders with 'Starts soon' and passes the start time", () => {
    const view = describe(row({ type: "event_soon", eventTitle: "Tree planting", eventStartsAt: new Date("2026-10-21T17:00:00Z"), actorName: "Green Seattle" }));
    assert.equal(view.lead, "Starts soon:");
    assert.equal(view.startsAt, "2026-10-21T17:00:00.000Z");
  });

  it("marks unread ones and opens stories from story notifications", () => {
    assert.equal(describe(row({})).unread, true);
    assert.equal(describe(row({ readAt: new Date() })).unread, false);
    assert.equal(describe(row({ type: "story_new", targetId: "org1" })).href, "/feed?story=org1");
  });
});
