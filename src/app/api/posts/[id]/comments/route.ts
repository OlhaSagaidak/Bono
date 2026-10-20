import { z } from "zod";
import { auth } from "@/auth";
import { getComments } from "@/lib/comments/queries";

// A post's comments, loaded when someone opens them under the post.
export async function GET(_request: Request, ctx: RouteContext<"/api/posts/[id]/comments">) {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const comments = await getComments(id, session.user.id);
  if (!comments) return new Response(null, { status: 404 });
  return Response.json({ comments }, { headers: { "Cache-Control": "no-store" } });
}
