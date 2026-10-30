import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Whether someone may do things others can see (comment, react, RSVP,
 * appear in notifications). Null when they may; otherwise the reason.
 * Accounts that haven't finished onboarding have no profile to show yet.
 * Unverified nonprofits may (Oct 29 decision): they act like supporters,
 * labeled "Not verified yet"; posting and donations stay verified-only.
 */
export async function publicStanding(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ onboardedAt: users.onboardedAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!row) return "Log in first.";
  if (!row.onboardedAt) return "Finish setting up your profile first.";
  return null;
}
