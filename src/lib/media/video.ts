import "server-only";
import type { db as Db } from "@/db";
import { media } from "@/db/schema";
import { megabytes } from "./limits";
import { readMp4, type Mp4Info } from "./mp4";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

export type VideoCheck = { kind: "error"; message: string } | ({ kind: "ok"; data: Buffer } & Mp4Info);

/**
 * Validates an uploaded video against a cap. The size is checked before the
 * file is read; the type, length and dimensions come from the file's own
 * header. Half a second of slack, since phones round lengths.
 */
export async function checkUploadedVideo(
  file: File,
  limits: { maxBytes: number; maxSeconds: number; vertical?: boolean },
): Promise<VideoCheck> {
  if (file.size > limits.maxBytes) {
    return { kind: "error", message: `That video is over ${megabytes(limits.maxBytes)}. Choose a shorter or smaller one.` };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const info = readMp4(data);
  if (!info) return { kind: "error", message: "Use an MP4 or MOV video (H.264 plays everywhere)." };
  if (info.durationMs === 0 || info.durationMs > limits.maxSeconds * 1000 + 500) {
    return { kind: "error", message: `Videos can be up to ${limits.maxSeconds} seconds long.` };
  }
  if (limits.vertical && info.width > info.height) {
    return { kind: "error", message: "Use a vertical (portrait) video." };
  }
  return { kind: "ok", data, ...info };
}

export async function storeVideo(tx: Tx, ownerId: string, video: Extract<VideoCheck, { kind: "ok" }>): Promise<string> {
  const [row] = await tx
    .insert(media)
    .values({
      ownerId,
      contentType: video.contentType,
      sizeBytes: video.data.length,
      durationMs: video.durationMs,
      width: video.width,
      height: video.height,
      data: video.data,
    })
    .returning({ id: media.id });
  return row.id;
}
