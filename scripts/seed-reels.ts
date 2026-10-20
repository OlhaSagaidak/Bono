import { existsSync, readFileSync } from "node:fs";
import { count, eq, inArray } from "drizzle-orm";
import type { db as Db } from "@/db";
import { reelCauses, reelLikes, reels } from "@/db/schema";
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

export async function seedReels(
  tx: Tx,
  now: number,
  orgs: { slug: string; id: string; causes: string[] }[],
  supporters: { id: string; interests: string[] }[],
  stableId: (key: string) => string,
): Promise<number> {
  let added = 0;
  for (const org of orgs) {
    for (let n = 1; n <= 6; n++) {
      const file = ["mp4", "mov"].map((ext) => `seed-media/reels/${org.slug}-${n}.${ext}`).find((f) => existsSync(f));
      if (!file) continue;
      const id = stableId(`reel:${org.slug}:${n}`);
      if ((await tx.select({ id: reels.id }).from(reels).where(eq(reels.id, id))).length) continue;

      const original = readFileSync(file);
      const info = readMp4(original);
      const fits = info && original.length <= REEL_VIDEO.maxBytes && info.durationMs <= REEL_VIDEO.maxSeconds * 1000;
      const data = fits ? original : shrinkVideo(file, "reel", 20, REEL_VIDEO.maxBytes);
      const video = data && readMp4(data);
      if (!data || !video) continue;
      if (video.width > video.height) {
        console.warn(`Skipping ${file}: reels are vertical, and this video is landscape.`);
        continue;
      }

      const meta = demoReels[org.slug]?.[n - 1];
      const mediaId = await storeVideo(tx, org.id, { kind: "ok", data, ...video });
      await tx.insert(reels).values({ id, nonprofitId: org.id, mediaId, caption: meta?.caption ?? "", createdAt: new Date(now - (meta?.hoursAgo ?? 24 * n) * 3_600_000) });
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
