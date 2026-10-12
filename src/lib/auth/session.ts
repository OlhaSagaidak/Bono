import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

// Use this instead of calling auth() directly in Server Components.
// - auth() generates a random CSRF token on every call; connection() tells Next
//   this render is request-time, so it doesn't flag the randomness as unstable
//   prerender output. Callers must still sit inside <Suspense>.
// - The JWT outlives the database row (e.g. after a reseed), so confirm the
//   account still exists and add its onboarding status, which can change after
//   the token was issued.
export async function getSession() {
  await connection();
  const session = await auth();
  if (!session) return null;

  const account = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { onboardedAt: true },
  });
  if (!account) return null;

  return { user: { ...session.user, onboarded: account.onboardedAt !== null } };
}
