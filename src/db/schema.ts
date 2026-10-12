import {
  customType,
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

export type User = typeof users.$inferSelect;
export type Cause = typeof causes.$inferSelect;
