import { eq } from "drizzle-orm";
import type { db as Db } from "@/db";
import { images } from "@/db/schema";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

// Decide the type from the file's first bytes, not the browser-sent MIME type,
// which the uploader controls. SVG is deliberately excluded: it can carry scripts.
function sniffImageType(bytes: Buffer): string | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export type ImageCheck =
  | { kind: "none" }
  | { kind: "error"; message: string }
  | { kind: "ok"; contentType: string; data: Buffer };

/** Validates an optional file input. An empty input means "keep the current image". */
export async function checkUploadedImage(file: FormDataEntryValue | null): Promise<ImageCheck> {
  if (!(file instanceof File) || file.size === 0) return { kind: "none" };
  if (file.size > MAX_IMAGE_BYTES) {
    return { kind: "error", message: "That image is over 2 MB. Choose a smaller one." };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImageType(data);
  if (!contentType) {
    return { kind: "error", message: "Use a PNG, JPEG or WebP image." };
  }
  return { kind: "ok", contentType, data };
}

type CheckedImage = Extract<ImageCheck, { kind: "ok" }>;

/** Stores an image inside the caller's transaction and returns its id. */
export async function storeImage(tx: Tx, ownerId: string, image: CheckedImage): Promise<string> {
  const [row] = await tx
    .insert(images)
    .values({ ownerId, contentType: image.contentType, data: image.data })
    .returning({ id: images.id });
  return row.id;
}

/** Stores the new image and removes the one it replaces, inside the caller's transaction. */
export async function replaceImage(
  tx: Tx,
  ownerId: string,
  image: CheckedImage,
  previousImageId: string | null,
): Promise<string> {
  const id = await storeImage(tx, ownerId, image);
  if (previousImageId) await tx.delete(images).where(eq(images.id, previousImageId));
  return id;
}

export const imageUrl = (id: string) => `/api/images/${id}`;
