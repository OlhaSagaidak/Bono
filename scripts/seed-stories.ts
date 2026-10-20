import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { and, eq, inArray, sql } from "drizzle-orm";
import sharp from "sharp";
import type { db as Db } from "@/db";
import { follows, images, media, notifications, stories, storyViews } from "@/db/schema";
import { fitImage, storeImage } from "@/lib/images";
import { STORY_VIDEO } from "@/lib/media/limits";
import { readMp4 } from "@/lib/media/mp4";
import { storeVideo } from "@/lib/media/video";
import { stories as demoStories } from "./seed-data";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

// Stories for the demo nonprofits. They expire after 24 hours, so every run
// replaces the demo organizations' stories with fresh ones.
//
// Media: seed-media/stories/<slug>-<n>.(jpg|jpeg|png|webp|mp4|mov), if present.
// A video over the story limits is shrunk to 360x640 and trimmed with macOS's
// built-in avconvert (no install needed); the result is cached in
// seed-media/.converted/. Without a file, a simple text card is drawn instead.

const COLORS: Record<string, [string, string]> = {
  "paws-haven": ["#065f46", "#84cc16"],
  "green-seattle": ["#14532d", "#22c55e"],
  "bright-futures": ["#1e3a8a", "#f59e0b"],
  "open-pantry": ["#7c2d12", "#f97316"],
  "new-roots": ["#4c1d95", "#ec4899"],
};

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Splits text into lines of at most `width` characters, on spaces. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

async function textCard(slug: string, orgName: string, text: string): Promise<Buffer> {
  const [from, to] = COLORS[slug] ?? ["#065f46", "#10b981"];
  const lines = wrap(text, 16);
  const top = 960 - (lines.length * 110) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="1080" height="1920" fill="url(#g)"/>
    <text x="540" y="260" font-family="Helvetica, Arial, sans-serif" font-size="48" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">${escapeXml(orgName)}</text>
    ${lines.map((l, i) => `<text x="540" y="${top + i * 110}" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="92" fill="#ffffff" text-anchor="middle">${escapeXml(l)}</text>`).join("")}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

/** A story video that fits the limits: the original, or a shrunk and trimmed copy. */
function fitVideo(path: string): Buffer | null {
  const original = readFileSync(path);
  const info = readMp4(original);
  if (info && original.length <= STORY_VIDEO.maxBytes && info.durationMs <= STORY_VIDEO.maxSeconds * 1000) return original;
  return shrinkVideo(path, "story", 8, STORY_VIDEO.maxBytes);
}

/**
 * Shrinks a video with macOS's avconvert, trimmed to `seconds`: first at
 * 360x640 (sharp, but its bitrate follows the source), then, if that is still
 * over `maxBytes`, at a lighter preset with a low fixed bitrate. Cached in
 * seed-media/.converted/ until the original changes.
 */
export function shrinkVideo(path: string, kind: string, seconds: number, maxBytes: number): Buffer | null {
  if (process.platform !== "darwin") {
    console.warn(`Skipping ${path}: it's over the ${kind} limits, and shrinking it needs macOS (avconvert).`);
    return null;
  }
  mkdirSync("seed-media/.converted", { recursive: true });
  const name = path.split("/").pop()!.replace(/\.\w+$/, "");
  for (const preset of ["Preset640x480", "PresetMediumQuality"]) {
    const out = `seed-media/.converted/${name}-${kind}-${preset}.mp4`;
    if (!existsSync(out) || statSync(out).mtimeMs < statSync(path).mtimeMs) {
      execFileSync("avconvert", ["-s", path, "-o", out, "-p", preset, "--duration", String(seconds), "--replace"], { stdio: "ignore" });
    }
    const converted = readFileSync(out);
    if (converted.length <= maxBytes && readMp4(converted)) return converted;
  }
  console.warn(`Skipping ${path}: still over the ${kind} limits after shrinking.`);
  return null;
}

export async function seedStories(
  tx: Tx,
  now: number,
  orgs: { slug: string; name: string; id: string }[],
  supporterIds: string[],
): Promise<number> {
  const orgIds = orgs.map((o) => o.id);
  // Out with the old demo stories (deleting the photo or video deletes the story).
  const old = await tx.select({ imageId: stories.imageId, mediaId: stories.mediaId }).from(stories).where(inArray(stories.nonprofitId, orgIds));
  const oldImages = old.flatMap((s) => (s.imageId ? [s.imageId] : []));
  const oldMedia = old.flatMap((s) => (s.mediaId ? [s.mediaId] : []));
  if (oldImages.length) await tx.delete(images).where(inArray(images.id, oldImages));
  if (oldMedia.length) await tx.delete(media).where(inArray(media.id, oldMedia));

  let count = 0;
  for (const org of orgs) {
    for (const [i, s] of (demoStories[org.slug] ?? []).entries()) {
      const base = `seed-media/stories/${org.slug}-${i + 1}`;
      const file = ["jpg", "jpeg", "png", "webp", "mp4", "mov"].map((ext) => `${base}.${ext}`).find((f) => existsSync(f));
      let imageId: string | null = null;
      let mediaId: string | null = null;
      const video = file && /\.(mp4|mov)$/.test(file) ? fitVideo(file) : null;
      if (video) {
        mediaId = await storeVideo(tx, org.id, { kind: "ok", data: video, ...readMp4(video)! });
      } else {
        const data = file && !/\.(mp4|mov)$/.test(file) ? readFileSync(file) : await textCard(org.slug, org.name, s.text);
        imageId = await storeImage(tx, org.id, await fitImage({ kind: "ok", contentType: "image/jpeg", data }, 1080));
      }
      const createdAt = new Date(now - s.hoursAgo * 3_600_000);
      const [story] = await tx
        .insert(stories)
        .values({
          nonprofitId: org.id,
          imageId,
          mediaId,
          caption: s.caption ?? "",
          sticker: s.sticker ?? "none",
          linkUrl: s.sticker === "link" ? "https://example.com/bono-demo-signup" : null,
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 24 * 3_600_000),
        })
        .returning({ id: stories.id });
      count++;
      // Some followers have already watched the older stories, so the row shows both ring colors.
      if (i === 0) {
        const watchers = await tx
          .select({ id: follows.followerId })
          .from(follows)
          .where(and(eq(follows.nonprofitId, org.id), inArray(follows.followerId, supporterIds)));
        const seen = watchers.filter((_, k) => k % 2 === 0);
        if (seen.length) await tx.insert(storyViews).values(seen.map((w) => ({ storyId: story.id, userId: w.id }))).onConflictDoNothing();
      }
    }
  }

  // "Posted a new story" for each follower, dated like the newest story.
  await tx.execute(sql`
    insert into ${notifications} (recipient_id, type, actor_id, target_id, group_key, created_at, since_at)
    select f.follower_id, 'story_new', s.nonprofit_id, s.nonprofit_id, 'story_new:' || s.nonprofit_id, max(s.created_at), max(s.created_at)
    from ${stories} s join ${follows} f on f.nonprofit_id = s.nonprofit_id
    where s.nonprofit_id in ${sql`(${sql.join(orgIds.map((id) => sql`${id}::uuid`), sql`, `)})`}
    group by f.follower_id, s.nonprofit_id
    on conflict (recipient_id, group_key) do update set created_at = excluded.created_at, read_at = null`);
  return count;
}
