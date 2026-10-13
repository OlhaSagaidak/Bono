import { inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { postViews, posts } from "@/db/schema";

// Receives dwell time from the feed (components/dwell-tracker.tsx), sent with
// navigator.sendBeacon every few seconds and when the page is hidden.
// Each batch: [{ postId, ms }] — milliseconds the post was on screen since the
// last batch. Capped, so a buggy or tampered client can't inflate the signal.

const MAX_MS_PER_BATCH = 60_000;
const batchSchema = z
  .array(z.object({ postId: z.uuid(), ms: z.number().int().min(0).max(MAX_MS_PER_BATCH) }))
  .min(1)
  .max(50);

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });

  let batch: z.infer<typeof batchSchema>;
  try {
    batch = batchSchema.parse(await request.json());
  } catch {
    return new Response(null, { status: 400 });
  }

  // Merge repeats of the same post, and ignore ids that aren't real posts.
  const totals = new Map<string, number>();
  for (const { postId, ms } of batch) totals.set(postId, Math.min(MAX_MS_PER_BATCH, (totals.get(postId) ?? 0) + ms));
  const existing = await db.select({ id: posts.id }).from(posts).where(inArray(posts.id, [...totals.keys()]));
  const rows = existing.map(({ id }) => ({ userId: session.user.id, postId: id, dwellMs: totals.get(id)! }));
  if (rows.length === 0) return new Response(null, { status: 204 });

  await db
    .insert(postViews)
    .values(rows)
    .onConflictDoUpdate({
      target: [postViews.userId, postViews.postId],
      set: { dwellMs: sql`${postViews.dwellMs} + excluded.dwell_ms`, lastSeenAt: sql`now()` },
    });
  return new Response(null, { status: 204 });
}
