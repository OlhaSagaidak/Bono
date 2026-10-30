import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { db as Db } from "@/db";
import { boosts, donations, nonprofitProfiles, posts } from "@/db/schema";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

// Fictional giving history for the demo, so badges show (lib/badges): every
// row is marked demo_seed and has no PayPal payment behind it. Each run
// replaces the previous seeded history (dates stay within the last year);
// real sandbox donations and boosts are never touched.
//
// Supporters give to nonprofits that share their interests, in patterns that
// land on every tier. Sponsors get a few past (already ended) boosts.

const DAY = 86_400_000;
// How much a supporter gives one nonprofit: [chance up to here, gifts min, gifts max].
const PATTERNS: [number, number, number][] = [
  [0.12, 12, 14], // Champion
  [0.3, 6, 8], // Established
  [0.55, 3, 4], // Emerging
  [0.85, 1, 2], // Rising
]; // the rest: none
const AMOUNTS = [1_000, 2_500, 2_500, 5_000];

export async function seedGivingHistory(
  tx: Tx,
  now: number,
  supporters: { id: string; name: string; interests: string[] }[],
  orgs: { slug: string; id: string; causes: string[] }[],
  sponsorIds: string[],
  boostFeeCents: number,
): Promise<{ donations: number; boosts: number }> {
  await tx.delete(donations).where(eq(donations.demoSeed, true));
  await tx.delete(boosts).where(eq(boosts.demoSeed, true));

  const payees = new Map(
    (await tx.select({ id: nonprofitProfiles.userId, email: nonprofitProfiles.paypalPayeeEmail }).from(nonprofitProfiles).where(inArray(nonprofitProfiles.userId, orgs.map((o) => o.id)))).map(
      (r) => [r.id, r.email],
    ),
  );
  const pick = (key: string) => parseInt(createHash("sha256").update(`history:${key}`).digest("hex").slice(0, 8), 16) / 2 ** 32;

  const rows: (typeof donations.$inferInsert)[] = [];
  for (const s of supporters) {
    for (const org of orgs.filter((o) => o.causes.some((c) => s.interests.includes(c)))) {
      const roll = pick(`${s.name}:${org.slug}`);
      const pattern = PATTERNS.find(([upTo]) => roll < upTo);
      if (!pattern) continue;
      const [, min, max] = pattern;
      const gifts = min + Math.floor(pick(`${s.name}:${org.slug}:n`) * (max - min + 1));
      for (let g = 0; g < gifts; g++) {
        // Spread over the last ~11 months, so they all count toward this year's tier.
        const at = new Date(now - (3 + Math.floor(pick(`${s.name}:${org.slug}:${g}:d`) * 330)) * DAY);
        rows.push({
          donorId: s.id,
          nonprofitId: org.id,
          postId: null, // not tied to a post, so no post looks more popular than it is
          amountCents: AMOUNTS[Math.floor(pick(`${s.name}:${org.slug}:${g}:a`) * AMOUNTS.length)],
          payeeEmail: payees.get(org.id) ?? "",
          status: "completed",
          createdAt: at,
          completedAt: at,
          demoSeed: true,
        });
      }
    }
  }
  if (rows.length) await tx.insert(donations).values(rows);

  // Two or three past boosts per sponsor, on posts of different nonprofits; all ended long ago.
  const boostRows: (typeof boosts.$inferInsert)[] = [];
  for (const [i, sponsorId] of sponsorIds.entries()) {
    for (let k = 0; k < 2 + (i % 2); k++) {
      const org = orgs[(i * 2 + k) % orgs.length];
      const [post] = await tx.select({ id: posts.id }).from(posts).where(and(eq(posts.nonprofitId, org.id))).limit(1);
      if (!post) continue;
      const start = new Date(now - (40 + 50 * k + 17 * i) * DAY);
      boostRows.push({ sponsorId, postId: post.id, amountCents: boostFeeCents, days: 7, startsAt: start, endsAt: new Date(start.getTime() + 7 * DAY), createdAt: start, demoSeed: true });
    }
  }
  if (boostRows.length) await tx.insert(boosts).values(boostRows);
  return { donations: rows.length, boosts: boostRows.length };
}
