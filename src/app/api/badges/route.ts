import { auth } from "@/auth";
import { unreadNotificationCount } from "@/lib/notifications/queries";

// Unread counts for the top bar, polled every few seconds while the page is
// visible (components/top-nav.tsx). No push service: polling is free.
export async function GET() {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });
  const notifications = await unreadNotificationCount(session.user.id);
  return Response.json({ notifications, messages: 0 }, { headers: { "Cache-Control": "no-store" } });
}
