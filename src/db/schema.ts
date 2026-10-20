import {
  type AnyPgColumn,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// "platform" is not here on purpose: Bono itself is a PayPal account, not a login.
// Size of the vectors from the embedding model (all-MiniLM-L6-v2), see lib/ai/embeddings.ts.
export const EMBEDDING_DIMENSIONS = 384;

export const roleEnum = pgEnum("role", ["user", "nonprofit", "sponsor"]);
export type Role = (typeof roleEnum.enumValues)[number];

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Always stored lowercased so sign-in is case-insensitive.
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  // Shown on profiles; at most 300 characters (lib/profiles/validation.ts).
  bio: text("bio").notNull().default(""),
  // Supporters' photo. Nonprofits and sponsors use their logo instead.
  avatarImageId: uuid("avatar_image_id").references((): AnyPgColumn => images.id, { onDelete: "set null" }),
  // Null until the role-specific onboarding form is saved; the app sends
  // signed-in users back to /onboarding until then.
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One shared list: supporters pick causes as interests, nonprofits as categories.
// The same slugs seed the AI feed's cold-start vectors later.
export const causes = pgTable("causes", {
  slug: text("slug").primaryKey(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  // Where a cause sits in "meaning space"; a new supporter's starting point is
  // the average of the causes they picked. Filled by `npm run embed`.
  embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
});

export const userInterests = pgTable(
  "user_interests",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    causeSlug: text("cause_slug").notNull().references(() => causes.slug),
  },
  (t) => [primaryKey({ columns: [t.userId, t.causeSlug] })],
);

// Logos now, post images later. Kept in Postgres so the app needs no paid
// storage service; uploads are size-capped and type-checked on the server.
export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Where an EIN was found: the IRS list of tax-exempt organizations, or the
// labeled registry of fictional EINs the demo nonprofits use.
export const einSourceEnum = pgEnum("ein_source", ["irs", "demo"]);

// Eligible rows from the IRS Exempt Organizations Business Master File (EO BMF),
// loaded by `npm run irs:load` (not committed). Only 501(c)(3) organizations
// with deductible contributions and unconditional exemption are kept.
export const irsExemptOrgs = pgTable("irs_exempt_orgs", {
  ein: text("ein").primaryKey(), // 9 digits, no dash
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  loadedAt: timestamp("loaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// DEMO DATA: fictional EINs for the fictional demo nonprofits, so the demo can
// pass the EIN check. Shown as "demo registry" in the UI, never as IRS data.
export const demoEinRegistry = pgTable("demo_ein_registry", {
  ein: text("ein").primaryKey(),
  name: text("name").notNull(),
});

export const nonprofitProfiles = pgTable("nonprofit_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mission: text("mission").notNull(),
  logoImageId: uuid("logo_image_id").references(() => images.id, { onDelete: "set null" }),
  // Donations go straight to this PayPal account (a sandbox Business account in the demo).
  paypalPayeeEmail: text("paypal_payee_email").notNull(),
  // Set when the EIN check passes and the verification fee is captured (week 2).
  // Until then the nonprofit can't post and is hidden from everyone but itself:
  // supporters should never have to wonder whether an organization is legit.
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  // Set once the EIN check passes (step 1 of verification). Unique: one EIN, one Bono account.
  ein: text("ein").unique(),
  einSource: einSourceEnum("ein_source"),
  einCheckedAt: timestamp("ein_checked_at", { withTimezone: true }),
  ...timestamps,
});

export const nonprofitCauses = pgTable(
  "nonprofit_causes",
  {
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
    causeSlug: text("cause_slug").notNull().references(() => causes.slug),
  },
  (t) => [primaryKey({ columns: [t.nonprofitId, t.causeSlug] })],
);

export const sponsorProfiles = pgTable("sponsor_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  logoImageId: uuid("logo_image_id").references(() => images.id, { onDelete: "set null" }),
  ...timestamps,
});

// Only nonprofits post. The embedding column for the AI feed arrives in week 3.
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
    body: text("body").notNull(),
    // ISO 639-1 code the post is written in; decides when to offer "Translate".
    language: text("language").notNull().default("en"),
    imageId: uuid("image_id").references(() => images.id, { onDelete: "set null" }),
    imageAlt: text("image_alt"),
    // The post's text plus its cause tags, embedded once when it's created.
    // Null until then (or if the model failed); `npm run embed` fills gaps.
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Newest-first paging, for the whole feed and per nonprofit. id breaks ties.
    index("posts_created_at_idx").on(t.createdAt.desc(), t.id.desc()),
    index("posts_nonprofit_created_at_idx").on(t.nonprofitId, t.createdAt.desc(), t.id.desc()),
  ],
);

// Cause tags per post: shown as chips now, embedded with the text later.
export const postCauses = pgTable(
  "post_causes",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    causeSlug: text("cause_slug").notNull().references(() => causes.slug),
  },
  (t) => [primaryKey({ columns: [t.postId, t.causeSlug] })],
);

// Signals for the AI feed: what someone liked and which nonprofits they follow.
export const postLikes = pgTable(
  "post_likes",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] }), index("post_likes_post_idx").on(t.postId)],
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.nonprofitId] }), index("follows_nonprofit_idx").on(t.nonprofitId)],
);

// Comments on posts. Replies are one level deep, like Facebook's: a reply's
// parentId is always a top-level comment.
export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => postComments.id, { onDelete: "cascade" }),
    body: text("body").notNull(), // at most 1000 characters (lib/comments/actions.ts)
    // Detected when posted (lib/comments/language.ts); null when too short to tell.
    language: text("language"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }), // shown as "Edited"
  },
  (t) => [index("post_comments_post_idx").on(t.postId, t.createdAt), index("post_comments_parent_idx").on(t.parentId)],
);

// One reaction per person per comment. No "angry": Bono is a positive space.
export const reactionEnum = pgEnum("reaction", ["like", "love", "care", "haha", "wow", "sad"]);
export type Reaction = (typeof reactionEnum.enumValues)[number];

export const commentReactions = pgTable(
  "comment_reactions",
  {
    commentId: uuid("comment_id").notNull().references(() => postComments.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reaction: reactionEnum("reaction").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })],
);

// Posts someone bookmarked: private, shown only on their own profile's Saved tab.
export const postSaves = pgTable(
  "post_saves",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] }), index("post_saves_user_idx").on(t.userId, t.createdAt)],
);

// How long each person has looked at each post (summed over visits), and when
// they last saw it. Written in batches from the browser (IntersectionObserver).
export const postViews = pgTable(
  "post_views",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    dwellMs: integer("dwell_ms").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

// Each person's learned interest vector (lib/feed/learn.ts). A cache: it's
// recomputed from their causes and engagement whenever something new happened.
export const userVectors = pgTable("user_vectors", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  // How many engagement signals went into it (0 = causes only, "cold start").
  signalCount: integer("signal_count").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

// Every Claude (Haiku) result, keyed by a hash of its exact input, so the same
// input is never sent twice (lib/ai/claude.ts). Translations and "why am I
// seeing this" lines both live here.
export const aiTexts = pgTable("ai_texts", {
  inputHash: text("input_hash").primaryKey(), // sha256 of kind + model + prompt + input
  kind: text("kind").notNull(), // "translation" | "why"
  model: text("model").notNull(),
  output: text("output").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Status of a payment (donations and verification fees).
// created: order exists at PayPal, buyer hasn't paid yet (or was declined and may retry).
// pending: PayPal accepted the payment but hasn't settled it; the webhook finishes it.
// refunded: the payee refunded it in PayPal (Bono itself never refunds).
export const donationStatusEnum = pgEnum("donation_status", ["created", "pending", "completed", "failed", "refunded"]);

// Money goes straight from donor to nonprofit (the PayPal order's payee); Bono
// only records what happened. Amounts are integer cents to avoid float rounding.
export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    donorId: uuid("donor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
    // The post the Donate button was on, if any; the AI feed counts it as engagement.
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: donationStatusEnum("status").notNull().default("created"),
    // Snapshot of where the money was sent, in case the nonprofit changes it later.
    payeeEmail: text("payee_email").notNull(),
    paypalOrderId: text("paypal_order_id").unique(),
    paypalCaptureId: text("paypal_capture_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("donations_nonprofit_idx").on(t.nonprofitId, t.createdAt.desc()),
    index("donations_donor_idx").on(t.donorId, t.createdAt.desc()),
  ],
);

// The one-time fee a nonprofit pays to the platform to get verified. Paying it
// from the nonprofit's own donation PayPal account (payer email = payee email)
// is what confirms that account is real and theirs.
export const verificationFees = pgTable("verification_fees", {
  id: uuid("id").primaryKey().defaultRandom(),
  nonprofitId: uuid("nonprofit_id")
    .notNull()
    .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: donationStatusEnum("status").notNull().default("created"),
  paypalOrderId: text("paypal_order_id").unique(),
  paypalCaptureId: text("paypal_capture_id").unique(),
  // Lowercased email of the PayPal account that paid, as PayPal reports it.
  payerEmail: text("payer_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// PayPal webhook events we've processed, by PayPal's event id: an audit trail,
// and a cheap way to skip an event PayPal delivers twice.
export const paypalWebhookEvents = pgTable("paypal_webhook_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  resourceId: text("resource_id"),
  // What we did with it, e.g. "donation completed" or "ignored: unknown order".
  outcome: text("outcome").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sponsor matching campaigns. A sponsor funds a pool (paid to the platform);
// donations that fit the campaign are matched from it via PayPal Payouts.
// "unfunded" until the pool payment completes; active = funded and within its dates.
export const campaignStatusEnum = pgEnum("campaign_status", ["unfunded", "funded"]);

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: uuid("sponsor_id")
    .notNull()
    .references(() => sponsorProfiles.userId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Either a cause (any verified nonprofit with it) or specific nonprofits (campaign_nonprofits).
  causeSlug: text("cause_slug").references(() => causes.slug),
  // 100 = 1:1, 50 = 0.5:1, 200 = 2:1.
  ratioPercent: integer("ratio_percent").notNull(),
  capCents: integer("cap_cents").notNull(), // most it matches for one donation
  poolCents: integer("pool_cents").notNull(),
  // Matched so far (including payouts still in flight). Never above poolCents.
  reservedCents: integer("reserved_cents").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: campaignStatusEnum("status").notNull().default("unfunded"),
  paypalOrderId: text("paypal_order_id").unique(),
  paypalCaptureId: text("paypal_capture_id").unique(),
  fundedAt: timestamp("funded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaignNonprofits = pgTable(
  "campaign_nonprofits",
  {
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.nonprofitId] })],
);

// queued -> processing (payout being created) -> sent (PayPal accepted it) -> paid,
// or failed (amount returned to the pool).
export const matchStatusEnum = pgEnum("match_status", ["queued", "processing", "sent", "paid", "failed"]);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(), // also the Payouts sender_batch_id: one payout per match, ever
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    // Unique: a donation is matched at most once, whatever retries or webhooks happen.
    donationId: uuid("donation_id").notNull().unique().references(() => donations.id, { onDelete: "cascade" }),
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    receiverEmail: text("receiver_email").notNull(), // snapshot of where the payout goes
    status: matchStatusEnum("status").notNull().default("queued"),
    payoutBatchId: text("payout_batch_id"),
    payoutItemId: text("payout_item_id"),
    payoutStatus: text("payout_status"), // PayPal's own item status, e.g. SUCCESS, UNCLAIMED
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("matches_campaign_idx").on(t.campaignId), index("matches_status_idx").on(t.status)],
);

// A sponsor pays the platform a fixed fee to boost a nonprofit's post for a
// number of days: a ranking bonus plus a visible "Boosted by <Sponsor>" label.
// Starts when the payment completes (startsAt/endsAt null until then).
export const boosts = pgTable(
  "boosts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsorProfiles.userId, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    days: integer("days").notNull(),
    paypalOrderId: text("paypal_order_id").unique(),
    paypalCaptureId: text("paypal_capture_id").unique(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("boosts_post_idx").on(t.postId, t.endsAt), index("boosts_sponsor_idx").on(t.sponsorId)],
);

// Events hosted by verified nonprofits. Times are stored in UTC and shown in
// each viewer's own timezone. Cancelled events stay, so people who responded
// see that they're cancelled.
export const eventLocationEnum = pgEnum("event_location", ["in_person", "online"]);
export const eventStatusEnum = pgEnum("event_status", ["scheduled", "cancelled"]);
export const rsvpStatusEnum = pgEnum("rsvp_status", ["interested", "going"]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    coverImageId: uuid("cover_image_id").references(() => images.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    locationType: eventLocationEnum("location_type").notNull(),
    address: text("address"),
    onlineUrl: text("online_url"),
    capacity: integer("capacity"), // null = no limit on "Going"
    status: eventStatusEnum("status").notNull().default("scheduled"),
    ...timestamps,
  },
  (t) => [index("events_starts_idx").on(t.startsAt), index("events_nonprofit_idx").on(t.nonprofitId, t.startsAt)],
);

export const eventCauses = pgTable(
  "event_causes",
  {
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    causeSlug: text("cause_slug").notNull().references(() => causes.slug),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.causeSlug] })],
);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index("event_rsvps_user_idx").on(t.userId, t.status)],
);

// Notifications: one row per thing to tell someone, written by lib/notifications.
// target_id points at the post, event, story or conversation the type implies.
// group_key makes a notification one-per-thing: repeats bump the same row
// (likes on a post become "Maya and 11 others liked your post") or are
// skipped (a reminder is sent once).
export const notificationTypeEnum = pgEnum("notification_type", [
  "message",
  "follow",
  "rsvp",
  "event_new",
  "story_new",
  "event_soon",
  "event_cancelled",
  "event_changed",
  "post_likes",
  "post_comment",
  "comment_reply",
  "comment_reactions",
]);
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    // Who did it: the latest one, for grouped notifications.
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "cascade" }),
    targetId: uuid("target_id"),
    groupKey: text("group_key").notNull(),
    // Grouped notifications count what happened since this moment (reset when
    // a new one arrives after the last was read).
    sinceAt: timestamp("since_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId, t.createdAt),
    uniqueIndex("notifications_group_idx").on(t.recipientId, t.groupKey),
  ],
);

// One-to-one messages. A conversation belongs to exactly two people: userLow
// and userHigh are the pair in a fixed order, so the same two people can't
// end up with two conversations. Each member's lastReadAt drives unread counts.
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userLow: uuid("user_low").notNull().references(() => users.id, { onDelete: "cascade" }),
    userHigh: uuid("user_high").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("conversations_pair_idx").on(t.userLow, t.userHigh)],
);

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index("conversation_members_user_idx").on(t.userId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(), // at most 2000 characters (lib/messages/actions.ts); may be empty with a photo
    // A photo sent in the conversation. Only the two members can load it (api/images).
    imageId: uuid("image_id").references(() => images.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt), index("messages_image_idx").on(t.imageId)],
);

// Blocking works both ways: neither person can message the other.
export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("blocks_blocked_idx").on(t.blockedId)],
);

// Reports are stored for review. There's no moderation screen in the demo.
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedId: uuid("reported_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // What was reported: a conversation or a comment.
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  commentId: uuid("comment_id").references(() => postComments.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Uploaded videos, kept in Postgres like images (no paid file storage), with
// strict size caps (lib/media/limits.ts). Length and size come from the file
// itself (lib/media/mp4.ts), never from the browser.
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  durationMs: integer("duration_ms").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Stories: a photo or a short video from a verified nonprofit, gone after 24
// hours. Queries skip expired ones; lib/stories/cleanup.ts deletes them.
export const storyStickerEnum = pgEnum("story_sticker", ["none", "donate", "link"]);

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
    // Exactly one of these is set.
    imageId: uuid("image_id").references(() => images.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "cascade" }),
    caption: text("caption").notNull().default(""),
    sticker: storyStickerEnum("sticker").notNull().default("none"),
    linkUrl: text("link_url"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stories_nonprofit_idx").on(t.nonprofitId, t.expiresAt), index("stories_expires_idx").on(t.expiresAt)],
);

export const storyViews = pgTable(
  "story_views",
  {
    storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.userId] }), index("story_views_user_idx").on(t.userId)],
);

// Reels: short vertical videos from verified nonprofits, shown at /reels.
export const reels = pgTable(
  "reels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nonprofitId: uuid("nonprofit_id")
      .notNull()
      .references(() => nonprofitProfiles.userId, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    caption: text("caption").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reels_created_idx").on(t.createdAt), index("reels_nonprofit_idx").on(t.nonprofitId, t.createdAt)],
);

export const reelCauses = pgTable(
  "reel_causes",
  {
    reelId: uuid("reel_id").notNull().references(() => reels.id, { onDelete: "cascade" }),
    causeSlug: text("cause_slug").notNull().references(() => causes.slug),
  },
  (t) => [primaryKey({ columns: [t.reelId, t.causeSlug] })],
);

export const reelLikes = pgTable(
  "reel_likes",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reelId: uuid("reel_id").notNull().references(() => reels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reelId] }), index("reel_likes_reel_idx").on(t.reelId)],
);

// Bookmarked reels: private, shown on the owner's Saved tab with saved posts.
export const reelSaves = pgTable(
  "reel_saves",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reelId: uuid("reel_id").notNull().references(() => reels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reelId] }), index("reel_saves_user_idx").on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Cause = typeof causes.$inferSelect;
