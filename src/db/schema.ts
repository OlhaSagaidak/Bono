import {
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// "platform" is not here on purpose: Bono itself is a PayPal account, not a login.
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
  about: text("about").notNull().default(""),
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

// created: order exists at PayPal, buyer hasn't paid yet (or was declined and may retry).
// pending: PayPal accepted the payment but hasn't settled it; the webhook finishes it.
export const donationStatusEnum = pgEnum("donation_status", ["created", "pending", "completed", "failed"]);

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

export type User = typeof users.$inferSelect;
export type Cause = typeof causes.$inferSelect;
