import "server-only";
import { eq, inArray, isNotNull, and } from "drizzle-orm";
import { db } from "@/db";
import { causes, nonprofitCauses, userInterests, type Role } from "@/db/schema";

/** Scales a vector to length 1, so dot products are cosine similarities. */
export function normalize(v: number[]): number[] {
  const length = Math.hypot(...v);
  return length === 0 ? v : v.map((x) => x / length);
}

/** The element-wise average of some vectors, normalized. */
export function average(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const sum = new Array<number>(vectors[0].length).fill(0);
  for (const v of vectors) for (let i = 0; i < v.length; i++) sum[i] += v[i];
  return normalize(sum);
}

/**
 * Where someone starts before they've engaged with anything ("cold start"):
 * the average of the causes they picked at sign-up. A nonprofit uses its own
 * causes. Sponsors pick none, so they get no vector and a fresh-first feed.
 */
export async function coldStartVector(userId: string, role: Role): Promise<number[] | null> {
  const slugs =
    role === "user"
      ? (await db.select({ slug: userInterests.causeSlug }).from(userInterests).where(eq(userInterests.userId, userId))).map((r) => r.slug)
      : role === "nonprofit"
        ? (await db.select({ slug: nonprofitCauses.causeSlug }).from(nonprofitCauses).where(eq(nonprofitCauses.nonprofitId, userId))).map((r) => r.slug)
        : [];
  if (slugs.length === 0) return null;

  const rows = await db
    .select({ embedding: causes.embedding })
    .from(causes)
    .where(and(inArray(causes.slug, slugs), isNotNull(causes.embedding)));
  return average(rows.map((r) => r.embedding!));
}
