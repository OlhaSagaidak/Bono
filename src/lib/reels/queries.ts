import "server-only";
import { and, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { causes, nonprofitProfiles, reelCauses, reelLikes, reelSaves, reels, userInterests } from "@/db/schema";
import { COVER_TEXT_MAX, type CoverTextPosition } from "@/components/cover-text";
import { imageUrl, mediaUrl } from "@/lib/image-url";

export const REEL_CAPTION_MAX = 300;
export const REEL_COVER_TEXT_MAX = COVER_TEXT_MAX;
const LIMIT = 30;

const reelColumns = (viewerId: string | null) => ({
  id: reels.id,
  mediaId: reels.mediaId,
  posterImageId: reels.posterImageId,
  coverText: reels.coverText,
  coverTextPosition: reels.coverTextPosition,
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
  poster: string | null; // first-frame image, when there is one
  coverText: string | null; // text over the video
  coverTextPosition: CoverTextPosition;
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
  return rows.map(({ mediaId, posterImageId, createdAt, ...r }) => ({
    ...r,
    src: mediaUrl(mediaId),
    poster: posterImageId ? imageUrl(posterImageId) : null,
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

/**
 * Reels mixed into the home feed (one after every few posts): the ones whose
 * causes best match the viewer's interests first, then the newest. Each feed
 * page takes the next few, so paging on shows different reels.
 */
export async function getFeedReels(viewerId: string, page: number, count = 3): Promise<ReelView[]> {
  const matches = sql`(select count(*) from ${reelCauses} rc join ${userInterests} ui on ui.cause_slug = rc.cause_slug
    where rc.reel_id = ${reels.id} and ui.user_id = ${viewerId})`;
  const rows = await db
    .select(reelColumns(viewerId))
    .from(reels)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, reels.nonprofitId))
    .where(and(isNotNull(nonprofitProfiles.verifiedAt), sql`${reels.nonprofitId} <> ${viewerId}`))
    .orderBy(desc(matches), desc(reels.createdAt), desc(reels.id))
    .limit(count)
    .offset((page - 1) * count);
  return withCauses(rows);
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
