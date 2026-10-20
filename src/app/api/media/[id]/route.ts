import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { media } from "@/db/schema";

// Serves a video from Postgres. Browsers (Safari especially) fetch video in
// byte ranges and won't play it otherwise, so Range requests are answered
// with just the bytes asked for, read with substring() so the whole file
// never has to leave the database for a small range.

const MAX_CHUNK = 1024 * 1024; // answer open-ended ranges a megabyte at a time

export async function GET(request: Request, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const [info] = await db.select({ contentType: media.contentType, size: media.sizeBytes }).from(media).where(eq(media.id, id));
  if (!info) return new Response("Not found", { status: 404 });

  const headers = {
    "Content-Type": info.contentType,
    "Accept-Ranges": "bytes",
    // A video never changes under the same id.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (!range) {
    const [row] = await db.select({ data: media.data }).from(media).where(eq(media.id, id));
    return new Response(new Uint8Array(row.data), { headers: { ...headers, "Content-Length": String(info.size) } });
  }

  let start: number;
  let end: number;
  if (range[1] === "") {
    // "bytes=-500": the last 500 bytes.
    start = Math.max(0, info.size - Number(range[2]));
    end = info.size - 1;
  } else {
    start = Number(range[1]);
    end = range[2] === "" ? Math.min(info.size - 1, start + MAX_CHUNK - 1) : Math.min(info.size - 1, Number(range[2]));
  }
  if (start > end || start >= info.size) {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${info.size}` } });
  }

  const [row] = await db
    .select({ chunk: sql<Buffer>`substring(${media.data} from ${start + 1} for ${end - start + 1})` })
    .from(media)
    .where(eq(media.id, id));
  return new Response(new Uint8Array(row.chunk), {
    status: 206,
    headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(end - start + 1) },
  });
}
