import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

// Simple limits against spam, counted from the rows people already create
// (no extra table or service): "at most `max` in the last `seconds`".
// Generous for real people, and it caps what a script can cost (comments
// can be translated by Claude, uploads fill the database).

export const LIMITS = {
  comments: { max: 10, seconds: 60, message: "You're commenting very fast. Wait a minute and try again." },
  messages: { max: 30, seconds: 60, message: "You're sending messages very fast. Wait a minute and try again." },
  uploads: { max: 10, seconds: 3600, message: "That's a lot of uploads for one hour. Try again later." },
} as const;

/** True when `whose` rows in `table` (by `timeColumn`) already reached the limit. */
export async function overLimit(table: SQL, whose: SQL, timeColumn: SQL, limit: { max: number; seconds: number }): Promise<boolean> {
  const result = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from ${table} where ${whose} and ${timeColumn} > now() - make_interval(secs => ${limit.seconds})`,
  );
  return result.rows[0].n >= limit.max;
}
