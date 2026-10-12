import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { images } from "@/db/schema";

export async function GET(_req: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });

  const image = await db.query.images.findFirst({ where: eq(images.id, id) });
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      // A replaced image gets a new id, so a given URL never changes content.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
