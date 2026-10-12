import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// "platform" is not here on purpose: Bono itself is a PayPal account, not a login.
export const roleEnum = pgEnum("role", ["user", "nonprofit", "sponsor"]);
export type Role = (typeof roleEnum.enumValues)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Always stored lowercased so sign-in is case-insensitive.
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
