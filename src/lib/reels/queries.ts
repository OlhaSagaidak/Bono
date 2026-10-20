import "server-only";
import { and, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { causes, nonprofitProfiles, reelCauses, reelLikes, reelSaves, reels } from "@/db/schema";
import { mediaUrl } from "@/lib/image-url";

export const REEL_CAPTION_MAX = 300;
const LIMIT = 30;

const reelColumns = (viewerId: string | null) => ({
  id: reels.id,
  mediaId: reels.mediaId,
  caption: reels.caption,
  createdAt: reels.createdAt,
  nonprofit: { id: nonprofitProfiles.userId, name: nonprofitProfiles.name, logoImageId: nonprofitProfiles.logoImageId },
  likes: sql<number>`(select count(*) from ${reelLikes} l where l.reel_id = ${reels.id})::int`,
  liked: viewerId ? sql<boolean>`exists (select 1 from ${reelLikes} l where l.reel_id = ${reels.id} and l.user_id = ${viewerId})` : sql<boolean>`false`,
  saved: viewerId ? sql<boolean>`exists (select 1 from ${reelSaves} s where s.reel_id = ${reels.id} and s.user_id = ${viewerId})` : sql<boolean>`false`,
});

export type ReelView = {
  id: string;
  src: string;
  caption: string;
  createdAt: string; // ISO
  nonprofit: { id: string; name: string; logoImageId: string | null };
  causes: { slug: string; label: string }[];
  likes: number;
  liked: boolean;
  saved: boolean;
};

async function withCauses(rows: Awaited<ReturnType<typeof reelRows>>): Promise<ReelView[]> {
  const ids = rows.map((r) => r.id);
  const tags = ids.length
    ? await db
        .select({ reelId: reelCauses.reelId, slug: causes.slug, label: causes.label })
        .from(reelCauses)
        .innerJoin(causes, eq(causes.slug, reelCauses.causeSlug))
        .where(inArray(reelCauses.reelId, ids))
        .orderBy(causes.sortOrder)
    : [];
  return rows.map(({ mediaId, createdAt, ...r }) => ({
    ...r,
    src: mediaUrl(mediaId),
    createdAt: createdAt.toISOString(),
    causes: tags.filter((t) => t.reelId === r.id).map(({ slug, label }) => ({ slug, label })),
  }));
}

function reelRows(viewerId: string | null, filters: SQL[], limit: number) {
  return db
    .select(reelColumns(viewerId))
    .from(reels)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, reels.nonprofitId))
    .where(and(isNotNull(nonprofitProfiles.verifiedAt), ...filters)) // the safe-space rule
    .orderBy(desc(reels.createdAt), desc(reels.id))
    .limit(limit);
}

/** The /reels feed: newest first, with `startId` (a shared link) moved to the top. */
export async function getReels(viewerId: string | null, startId?: string): Promise<ReelView[]> {
  const rows = await reelRows(viewerId, [], LIMIT);
  if (startId && !rows.some((r) => r.id === startId)) {
    rows.unshift(...(await reelRows(viewerId, [eq(reels.id, startId)], 1)));
  }
  const ordered = startId ? [...rows.filter((r) => r.id === startId), ...rows.filter((r) => r.id !== startId)] : rows;
  return withCauses(ordered);
}

/** One nonprofit's reels, for its profile page. */
export async function getNonprofitReels(nonprofitId: string): Promise<ReelView[]> {
  return withCauses(await reelRows(null, [eq(reels.nonprofitId, nonprofitId)], 12));
}

/** The owner's saved reels, most recently saved first. */
export async function getSavedReels(userId: string): Promise<ReelView[]> {
  const rows = await db
    .select(reelColumns(userId))
    .from(reelSaves)
    .innerJoin(reels, eq(reels.id, reelSaves.reelId))
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, reels.nonprofitId))
    .where(and(eq(reelSaves.userId, userId), isNotNull(nonprofitProfiles.verifiedAt)))
    .orderBy(desc(reelSaves.createdAt))
    .limit(LIMIT);
  return withCauses(rows);
}
