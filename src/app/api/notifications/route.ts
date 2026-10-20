import { auth } from "@/auth";
import { listNotifications } from "@/lib/notifications/queries";

// The bell's dropdown: the latest few notifications, loaded when it opens.
export async function GET() {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });
  const { items } = await listNotifications(session.user.id, { limit: 10 });
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
