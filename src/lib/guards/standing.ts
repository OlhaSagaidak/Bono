import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { nonprofitProfiles, users } from "@/db/schema";

/**
 * Whether someone may do things others can see (comment, react, RSVP,
 * appear in notifications). Null when they may; otherwise the reason.
 * Unverified nonprofits stay invisible until verified (the safe-space rule),
 * and accounts that haven't finished onboarding have no profile to show yet.
 */
export async function publicStanding(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ role: users.role, onboardedAt: users.onboardedAt, verifiedAt: nonprofitProfiles.verifiedAt })
    .from(users)
    .leftJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, users.id))
    .where(eq(users.id, userId));
  if (!row) return "Log in first.";
  if (!row.onboardedAt) return "Finish setting up your profile first.";
  if (row.role === "nonprofit" && !row.verifiedAt) return "Your organization can do this once it's verified.";
  return null;
}
