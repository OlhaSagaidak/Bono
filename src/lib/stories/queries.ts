import "server-only";
import { sql } from "drizzle-orm";
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
      and (s.nonprofit_id = ${viewerId}
           or s.nonprofit_id in (select f.nonprofit_id from ${follows} f where f.follower_id = ${viewerId}))
    order by s.created_at asc`);

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
  return [...byOrg.values()].sort(
    (a, b) => Number(b.own) - Number(a.own) || Number(a.allSeen) - Number(b.allSeen) || latest(b).localeCompare(latest(a)),
  );
}

let lastCleanup = 0;

/**
 * Deletes expired stories by deleting their photo or video (the story row
 * goes with it). Runs after responses rather than on a schedule (there's no
 * scheduler on the free plan), at most every ten minutes per server.
 */
export async function cleanUpExpiredStories(now = Date.now()): Promise<void> {
  if (now - lastCleanup < 10 * 60_000) return;
  lastCleanup = now;
  await db.execute(sql`delete from ${images} where id in (select image_id from ${stories} where expires_at <= now() and image_id is not null)`);
  await db.execute(sql`delete from ${media} where id in (select media_id from ${stories} where expires_at <= now() and media_id is not null)`);
}
