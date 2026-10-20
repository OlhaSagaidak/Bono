// Upload routes are plain route handlers, which (unlike Server Actions)
// don't check where a request came from. Auth cookies are SameSite=Lax, so
// other sites can't post with them anyway; this is a second, cheap layer.
export function fromOurOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
