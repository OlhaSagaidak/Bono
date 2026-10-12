import { connection } from "next/server";
import { auth } from "@/auth";

// Use this instead of calling auth() directly in Server Components.
// auth() generates a random CSRF token on every call; connection() tells
// Next this render is request-time, so it doesn't flag the randomness as
// unstable prerender output. Callers must still sit inside <Suspense>.
export async function getSession() {
  await connection();
  return auth();
}
