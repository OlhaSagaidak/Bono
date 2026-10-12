import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// Renders nothing. Placed inside <Suspense> because reading the session is
// request-time data, which Cache Components keeps out of the static shell.
export async function RedirectIfSignedIn() {
  if (await getSession()) redirect("/");
  return null;
}
