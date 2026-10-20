import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { nonprofitCauses, nonprofitProfiles, reelCauses, reels } from "@/db/schema";
import { REEL_VIDEO } from "@/lib/media/limits";
import { checkUploadedVideo, storeVideo } from "@/lib/media/video";
import { REEL_CAPTION_MAX } from "@/lib/reels/queries";

// Posting a reel: a vertical video up to REEL_VIDEO's limits, a caption and
// the organization's own cause tags. A route rather than a Server Action
// because the video can exceed the Server Action body limit.

const fieldsSchema = z.object({
  caption: z.string().trim().max(REEL_CAPTION_MAX, `Keep the caption under ${REEL_CAPTION_MAX} characters.`),
  causes: z.array(z.string()).min(1, "Pick at least one cause."),
});

type Errors = Record<string, string[]>;
const fail = (status: number, body: { error?: string; fieldErrors?: Errors }) => Response.json(body, { status });

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return fail(401, { error: "Log in to post a reel." });
  const nonprofitId = session.user.id;
  const profile = await db.query.nonprofitProfiles.findFirst({
    where: eq(nonprofitProfiles.userId, nonprofitId),
    columns: { verifiedAt: true },
  });
  if (session.user.role !== "nonprofit" || !profile?.verifiedAt) return fail(403, { error: "Only verified nonprofits can post reels." });

  // Refuse oversized uploads before reading the body.
  if (Number(request.headers.get("content-length") ?? 0) > REEL_VIDEO.maxBytes + 64 * 1024) {
    return fail(413, { fieldErrors: { file: ["That video is too large."] } });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, { error: "That upload didn't arrive in one piece. Please try again." });
  }

  const fields = fieldsSchema.safeParse({ caption: form.get("caption") ?? "", causes: form.getAll("causes").map(String) });
  const fieldErrors: Errors = fields.success ? {} : (z.flattenError(fields.error).fieldErrors as Errors);
  const file = form.get("file");
  let video: Extract<Awaited<ReturnType<typeof checkUploadedVideo>>, { kind: "ok" }> | null = null;
  if (!(file instanceof File) || file.size === 0) {
    fieldErrors.file = ["Choose a video."];
  } else {
    const checked = await checkUploadedVideo(file, { ...REEL_VIDEO, vertical: true });
    if (checked.kind === "error") fieldErrors.file = [checked.message];
    else video = checked;
  }
  if (!fields.success || !video || Object.keys(fieldErrors).length > 0) return fail(400, { fieldErrors });

  // Reels may only use the nonprofit's own causes, like its posts.
  const own = new Set(
    (await db.select({ slug: nonprofitCauses.causeSlug }).from(nonprofitCauses).where(eq(nonprofitCauses.nonprofitId, nonprofitId))).map((r) => r.slug),
  );
  if (fields.data.causes.some((c) => !own.has(c))) return fail(400, { fieldErrors: { causes: ["Tag the reel with your organization's own causes."] } });

  const id = await db.transaction(async (tx) => {
    const mediaId = await storeVideo(tx, nonprofitId, video);
    const [reel] = await tx.insert(reels).values({ nonprofitId, mediaId, caption: fields.data.caption }).returning({ id: reels.id });
    await tx.insert(reelCauses).values(fields.data.causes.map((causeSlug) => ({ reelId: reel.id, causeSlug })));
    return reel.id;
  });
  return Response.json({ id }, { status: 201 });
}
