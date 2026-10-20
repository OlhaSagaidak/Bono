import { eq, sql } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { follows, nonprofitProfiles, stories } from "@/db/schema";
import { checkUploadedImage, fitImage, storeImage } from "@/lib/images";
import { STORY_VIDEO } from "@/lib/media/limits";
import { LIMITS, overLimit } from "@/lib/guards/rate-limit";
import { fromOurOrigin } from "@/lib/guards/same-origin";
import { checkUploadedVideo, storeVideo } from "@/lib/media/video";
import { notify } from "@/lib/notifications/notify";
import { CAPTION_MAX, cleanUpExpiredStories, STORY_HOURS } from "@/lib/stories/queries";

// Posting a story. This is a route rather than a Server Action because a
// video can be larger than the Server Action body limit; the size is still
// capped here before anything is read into memory.

const fieldsSchema = z
  .object({
    caption: z.string().trim().max(CAPTION_MAX, `Keep the caption under ${CAPTION_MAX} characters.`),
    sticker: z.enum(["none", "donate", "link"]),
    linkUrl: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.sticker !== "link") return;
    const url = z.url({ protocol: /^https$/ }).max(500).safeParse(v.linkUrl);
    if (!url.success) ctx.addIssue({ code: "custom", path: ["linkUrl"], message: "Enter a full https:// link." });
  });

type Errors = Record<string, string[]>;
const fail = (status: number, body: { error?: string; fieldErrors?: Errors }) => Response.json(body, { status });

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return fail(401, { error: "Log in to post a story." });
  const nonprofitId = session.user.id;
  const profile = await db.query.nonprofitProfiles.findFirst({
    where: eq(nonprofitProfiles.userId, nonprofitId),
    columns: { verifiedAt: true },
  });
  if (session.user.role !== "nonprofit" || !profile?.verifiedAt) return fail(403, { error: "Only verified nonprofits can post stories." });

  // Where it came from and how often, before reading anything.
  if (!fromOurOrigin(request)) return fail(403, { error: "That upload didn't come from Bono." });
  if (await overLimit(sql`${stories}`, sql`nonprofit_id = ${nonprofitId}`, sql`created_at`, LIMITS.uploads)) {
    return fail(429, { error: LIMITS.uploads.message });
  }
  // Refuse oversized uploads before reading the body. Browsers always send the
  // size; without it the whole body would have to be read to find out.
  const size = Number(request.headers.get("content-length"));
  if (!size) return fail(411, { error: "That upload didn't say how large it is. Please try again." });
  if (size > STORY_VIDEO.maxBytes + 64 * 1024) return fail(413, { fieldErrors: { file: ["That file is too large."] } });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, { error: "That upload didn't arrive in one piece. Please try again." });
  }

  const fields = fieldsSchema.safeParse({
    caption: form.get("caption") ?? "",
    sticker: form.get("sticker") ?? "none",
    linkUrl: form.get("linkUrl") ?? "",
  });
  const fieldErrors: Errors = fields.success ? {} : (z.flattenError(fields.error).fieldErrors as Errors);

  // A photo (JPEG, PNG, WebP) or a short video (MP4/MOV).
  const file = form.get("file");
  let photo: Awaited<ReturnType<typeof fitImage>> | null = null;
  let video: Extract<Awaited<ReturnType<typeof checkUploadedVideo>>, { kind: "ok" }> | null = null;
  if (!(file instanceof File) || file.size === 0) {
    fieldErrors.file = ["Choose a photo or a video."];
  } else if (file.type.startsWith("video/") || /\.(mp4|mov|m4v)$/i.test(file.name)) {
    const checked = await checkUploadedVideo(file, STORY_VIDEO);
    if (checked.kind === "error") fieldErrors.file = [checked.message];
    else video = checked;
  } else {
    const checked = await checkUploadedImage(file);
    if (checked.kind === "error") fieldErrors.file = [checked.message];
    else if (checked.kind === "ok") {
      // Stories are tall: at most 1080 px wide is plenty for a phone screen.
      photo = await fitImage(checked, 1080).catch(() => null);
      if (!photo) fieldErrors.file = ["That image couldn't be read. Try another one."];
    }
  }
  if (!fields.success || Object.keys(fieldErrors).length > 0) return fail(400, { fieldErrors });

  const { caption, sticker, linkUrl } = fields.data;
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(stories)
      .values({
        nonprofitId,
        imageId: photo ? await storeImage(tx, nonprofitId, photo) : null,
        mediaId: video ? await storeVideo(tx, nonprofitId, video) : null,
        caption,
        sticker,
        linkUrl: sticker === "link" ? linkUrl : null,
        expiresAt: new Date(Date.now() + STORY_HOURS * 3_600_000),
      })
      .returning({ id: stories.id });
    return row.id;
  });

  // One "posted a new story" per organization, moved back to the top by each new one.
  const followers = await db.select({ id: follows.followerId }).from(follows).where(eq(follows.nonprofitId, nonprofitId));
  await notify(followers.map((f) => f.id), { type: "story_new", actorId: nonprofitId, targetId: nonprofitId, key: nonprofitId, repeat: "bump" });
  after(() => cleanUpExpiredStories().catch((error) => console.error("Story cleanup failed:", error)));
  return Response.json({ id }, { status: 201 });
}
