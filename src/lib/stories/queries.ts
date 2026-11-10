import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, images, media, nonprofitProfiles, stories, storyViews } from "@/db/schema";
import { imageUrl, mediaUrl } from "@/lib/image-url";

export const STORY_HOURS = 24;
export const CAPTION_MAX = 150;

export type StoryView = {
  id: string;
  kind: "image" | "video";
  src: string;
  caption: string;
  sticker: "none" | "donate" | "link";
  linkUrl: string | null;
  createdAt: string; // ISO
  seen: boolean;
  /** How many people saw it: only for the organization's own stories. */
  viewCount: number | null;
};

export type StoryOrg = {
  id: string;
  name: string;
  logoImageId: string | null;
  own: boolean;
  /** Every story already seen: the ring turns grey and the row puts it last. */
  allSeen: boolean;
  stories: StoryView[];
};

/**
 * The stories row: the viewer's own active stories (for a nonprofit), then
 * organizations they follow with unseen stories, then the ones they've seen.
 * Expired stories never appear, even before cleanup removes them.
 */
export async function getStoriesRow(viewerId: string): Promise<StoryOrg[]> {
  const rows = await db.execute<{
    id: string;
    nonprofit_id: string;
    name: string;
    logo_image_id: string | null;
    image_id: string | null;
    media_id: string | null;
    caption: string;
    sticker: StoryView["sticker"];
    link_url: string | null;
    created_at: string | Date;
    seen: boolean;
    view_count: number | null;
  }>(sql`
    select s.id, s.nonprofit_id, np.name, np.logo_image_id, s.image_id, s.media_id, s.caption, s.sticker, s.link_url, s.created_at,
           exists (select 1 from ${storyViews} v where v.story_id = s.id and v.user_id = ${viewerId}) as seen,
           case when s.nonprofit_id = ${viewerId} then (select count(*) from ${storyViews} v where v.story_id = s.id)::int end as view_count
    from ${stories} s
    join ${nonprofitProfiles} np on np.user_id = s.nonprofit_id
    where s.expires_at > now()
      and np.verified_at is not null
    order by s.created_at asc`);
  // Organizations you follow come first; then other verified nonprofits, so the
  // row is never empty for someone who follows only a few.
  const followed = new Set(
    (await db.select({ id: follows.nonprofitId }).from(follows).where(eq(follows.followerId, viewerId))).map((f) => f.id),
  );

  const byOrg = new Map<string, StoryOrg>();
  for (const r of rows.rows) {
    const org = byOrg.get(r.nonprofit_id) ?? {
      id: r.nonprofit_id,
      name: r.name,
      logoImageId: r.logo_image_id,
      own: r.nonprofit_id === viewerId,
      allSeen: true,
      stories: [],
    };
    // Your own stories count as seen: the ring is for news from others.
    const seen = org.own || r.seen;
    org.allSeen &&= seen;
    org.stories.push({
      id: r.id,
      kind: r.media_id ? "video" : "image",
      src: r.media_id ? mediaUrl(r.media_id) : imageUrl(r.image_id!),
      caption: r.caption,
      sticker: r.sticker,
      linkUrl: r.link_url,
      createdAt: new Date(r.created_at).toISOString(),
      seen,
      viewCount: r.view_count,
    });
    byOrg.set(r.nonprofit_id, org);
  }

  const latest = (o: StoryOrg) => o.stories.at(-1)!.createdAt;
  const isFollowed = (o: StoryOrg) => Number(followed.has(o.id));
  return [...byOrg.values()].sort(
    (a, b) =>
      Number(b.own) - Number(a.own) ||
      isFollowed(b) - isFollowed(a) ||
      Number(a.allSeen) - Number(b.allSeen) ||
      latest(b).localeCompare(latest(a)),
  );
}

let lastCleanup = 0;
let lastRefresh = 0;

const DAY_MS = 24 * 3_600_000;
const DEMO_STORIES_PER_DAY = 3;

/**
 * Keeps the demo's stories fresh without a scheduler: each day a different
 * few of each demo nonprofit's pooled stories (demo_seed) come back, with new
 * times, as if just posted, and with nobody having seen them yet. Runs when
 * stories are about to be shown, at most every ten minutes per server.
 */
export async function refreshDemoStories(now = Date.now()): Promise<void> {
  if (now - lastRefresh < 10 * 60_000) return;
  lastRefresh = now;
  const day = Math.floor(now / DAY_MS);
  // Today's picks: a window of the pool that moves along by one story a day.
  const picked = await db.execute<{ id: string; slot: number }>(sql`
    with pool as (
      select id, row_number() over (partition by nonprofit_id order by id) - 1 as rank,
             count(*) over (partition by nonprofit_id) as size, expires_at
      from ${stories} where demo_seed
    )
    select id, ((rank - ${day} % size + size) % size)::int as slot from pool
    where ((rank - ${day} % size + size) % size) < least(size, ${DEMO_STORIES_PER_DAY}) and expires_at <= now()`);
  for (const p of picked.rows) {
    // Spread them over the last few hours, oldest first, like real posting.
    const createdAt = new Date(now - (DEMO_STORIES_PER_DAY - p.slot) * 2 * 3_600_000);
    await db.update(stories).set({ createdAt, expiresAt: new Date(createdAt.getTime() + DAY_MS) }).where(eq(stories.id, p.id));
    await db.delete(storyViews).where(eq(storyViews.storyId, p.id));
  }
}

/**
 * Deletes expired stories by deleting their photo or video (the story row
 * goes with it). Runs after responses rather than on a schedule (there's no
 * scheduler on the free plan), at most every ten minutes per server.
 */
export async function cleanUpExpiredStories(now = Date.now()): Promise<void> {
  if (now - lastCleanup < 10 * 60_000) return;
  lastCleanup = now;
  // Demo stories stay in their pool (see refreshDemoStories); everyone else's go.
  await db.execute(sql`delete from ${images} where id in (select image_id from ${stories} where expires_at <= now() and image_id is not null and not demo_seed)`);
  await db.execute(sql`delete from ${media} where id in (select media_id from ${stories} where expires_at <= now() and media_id is not null and not demo_seed)`);
}
