import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import type { db as Db } from "@/db";
import { media, reelCauses, reelLikes, reels } from "@/db/schema";
import { fitImage, replaceImage, storeImage } from "@/lib/images";
import { REEL_VIDEO } from "@/lib/media/limits";
import { readMp4 } from "@/lib/media/mp4";
import { storeVideo } from "@/lib/media/video";
import { reels as demoReels } from "./seed-data";
import { shrinkVideo } from "./seed-stories";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

// Reels for the demo nonprofits, from seed-media/reels/<slug>-<n>.(mp4|mov).
// There's no stand-in without a file: reels are videos. Each file becomes
// one reel with a fixed id, added once (re-runs keep it and its likes).
// Videos over the reel limits are shrunk and trimmed to 20 s with macOS's
// built-in avconvert; landscape videos are skipped, since reels are vertical.
// Each reel also gets a poster frame from macOS's Quick Look (qlmanage), so it
// shows at once instead of a black box; reels added before posters get one too.
//
// Phone-sized copies in seed-media/reels-web/<slug>-<n>.mp4 are used when they
// exist, and replace a reel's stored video when they differ: about 1 Mbps at
// 540x960 loads several times faster than the originals. They were made with
//   ffmpeg -i in.mp4 -t 20 -vf "scale=-2:'min(960,ih)'" -c:v libx264 -crf 26
//     -maxrate 1400k -bufsize 2800k -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart out.mp4

/** A still from the video as a PNG, or null where Quick Look isn't available. */
function posterFrame(file: string): Buffer | null {
  if (process.platform !== "darwin") return null;
  const dir = "seed-media/.converted/posters";
  mkdirSync(dir, { recursive: true });
  const out = `${dir}/${file.split("/").pop()}.png`;
  if (!existsSync(out) || statSync(out).mtimeMs < statSync(file).mtimeMs) {
    try {
      execFileSync("qlmanage", ["-t", "-s", "720", "-o", dir, file], { stdio: "ignore" });
    } catch {
      return null;
    }
  }
  return existsSync(out) ? readFileSync(out) : null;
}

async function storePoster(tx: Tx, ownerId: string, file: string, replacing: string | null = null): Promise<string | null> {
  const frame = posterFrame(file);
  if (!frame) return null;
  const image = await fitImage({ kind: "ok", contentType: "image/png", data: frame }, 720);
  return replacing ? replaceImage(tx, ownerId, image, replacing) : storeImage(tx, ownerId, image);
}

/** The video to store for a seed file: as is when it fits the reel limits, else shrunk. */
function reelVideo(file: string) {
  const original = readFileSync(file);
  const info = readMp4(original);
  const fits = info && original.length <= REEL_VIDEO.maxBytes && info.durationMs <= REEL_VIDEO.maxSeconds * 1000;
  const data = fits ? original : shrinkVideo(file, "reel", 20, REEL_VIDEO.maxBytes);
  const video = data && readMp4(data);
  return data && video ? { data, ...video } : null;
}

export async function seedReels(
  tx: Tx,
  now: number,
  orgs: { slug: string; id: string; causes: string[] }[],
  supporters: { id: string; interests: string[] }[],
  stableId: (key: string) => string,
): Promise<number> {
  let added = 0;
  for (const org of orgs) {
    for (let n = 1; n <= 8; n++) {
      const web = `seed-media/reels-web/${org.slug}-${n}.mp4`;
      const file = existsSync(web) ? web : ["mp4", "mov"].map((ext) => `seed-media/reels/${org.slug}-${n}.${ext}`).find((f) => existsSync(f));
      if (!file) continue;
      const id = stableId(`reel:${org.slug}:${n}`);
      const [existing] = await tx
        .select({ mediaId: reels.mediaId, poster: reels.posterImageId, size: media.sizeBytes })
        .from(reels)
        .innerJoin(media, eq(media.id, reels.mediaId))
        .where(eq(reels.id, id));
      if (existing) {
        // Captions and cover text follow seed-data, so edits there show up on re-runs.
        const meta = demoReels[org.slug]?.[n - 1];
        if (meta) await tx.update(reels).set({ caption: meta.caption, coverText: meta.coverText ?? null }).where(eq(reels.id, id));
        const video = file === web ? reelVideo(file) : null;
        if (video && video.data.length !== existing.size && video.height > video.width) {
          // A lighter copy of the same video: swap it in, keeping the reel, its likes and saves.
          await tx
            .update(media)
            .set({ data: video.data, sizeBytes: video.data.length, durationMs: video.durationMs, width: video.width, height: video.height })
            .where(eq(media.id, existing.mediaId));
          const posterImageId = await storePoster(tx, org.id, file, existing.poster);
          if (posterImageId) await tx.update(reels).set({ posterImageId }).where(eq(reels.id, id));
        } else if (!existing.poster) {
          const posterImageId = await storePoster(tx, org.id, file);
          if (posterImageId) await tx.update(reels).set({ posterImageId }).where(and(eq(reels.id, id), isNull(reels.posterImageId)));
        }
        continue;
      }

      const video = reelVideo(file);
      if (!video) continue;
      if (video.width > video.height) {
        console.warn(`Skipping ${file}: reels are vertical, and this video is landscape.`);
        continue;
      }

      const meta = demoReels[org.slug]?.[n - 1];
      const mediaId = await storeVideo(tx, org.id, { kind: "ok", ...video });
      const posterImageId = await storePoster(tx, org.id, file);
      await tx.insert(reels).values({ id, nonprofitId: org.id, mediaId, posterImageId, caption: meta?.caption ?? "", coverText: meta?.coverText ?? null, createdAt: new Date(now - (meta?.hoursAgo ?? 24 * n) * 3_600_000) });
      await tx.insert(reelCauses).values(org.causes.map((causeSlug) => ({ reelId: id, causeSlug })));
      // A few likes from supporters who share the organization's causes.
      const fans = supporters.filter((s) => s.interests.some((c) => org.causes.includes(c))).slice(0, 3 + n);
      if (fans.length) await tx.insert(reelLikes).values(fans.map((f) => ({ userId: f.id, reelId: id }))).onConflictDoNothing();
      added++;
    }
  }
  const [{ total }] = await tx
    .select({ total: count() })
    .from(reels)
    .where(inArray(reels.nonprofitId, orgs.map((o) => o.id)));
  if (added) console.log(`Added ${added} reels from seed-media/reels.`);
  return total;
}
