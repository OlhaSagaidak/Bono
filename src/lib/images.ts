import { eq } from "drizzle-orm";
import sharp from "sharp";
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

// Uploads are re-encoded on the server with sharp: it applies the photo's
// rotation, drops metadata (such as GPS location), and keeps Postgres small.

/** A profile photo or logo: a 512 x 512 square, cropped from the center. */
export async function squarePhoto(image: CheckedImage): Promise<CheckedImage> {
  const data = await sharp(image.data).rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  return { kind: "ok", contentType: "image/webp", data };
}

/** A post or cover image: at most 1600 px wide, never enlarged. */
export async function fitImage(image: CheckedImage, maxWidth = 1600): Promise<CheckedImage> {
  const data = await sharp(image.data).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  return { kind: "ok", contentType: "image/webp", data };
}

export type PhotoChange = { kind: "keep" } | { kind: "remove" } | { kind: "replace"; image: CheckedImage } | { kind: "error"; message: string };

/** What a photo field asks for: keep the current one, remove it, or replace it (squared). */
export async function photoChange(formData: FormData, field: string, removeField: string): Promise<PhotoChange> {
  const upload = await checkUploadedImage(formData.get(field));
  if (upload.kind === "error") return upload;
  if (upload.kind === "ok") {
    try {
      return { kind: "replace", image: await squarePhoto(upload) };
    } catch {
      return { kind: "error", message: "That image couldn't be read. Try another one." };
    }
  }
  return formData.get(removeField) === "on" ? { kind: "remove" } : { kind: "keep" };
}

/** Applies a PhotoChange inside the caller's transaction; returns the new image id (or null). */
export async function applyPhotoChange(tx: Tx, ownerId: string, change: PhotoChange, currentId: string | null): Promise<string | null> {
  if (change.kind === "replace") return replaceImage(tx, ownerId, change.image, currentId);
  if (change.kind === "remove") {
    if (currentId) await tx.delete(images).where(eq(images.id, currentId));
    return null;
  }
  return currentId;
}

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
