import "server-only";
import { headers } from "next/headers";
import { LANGUAGES } from "@/lib/posts/validation";

const SUPPORTED = new Set<string>(LANGUAGES.map((l) => l.value));

/**
 * The viewer's language, from their browser's Accept-Language header
 * ("uk-UA,uk;q=0.9,en;q=0.8" -> "uk"), limited to the languages Bono posts in.
 * English when nothing matches. Posts in any other language get a Translate button.
 */
export async function viewerLanguage(): Promise<string> {
  const accept = (await headers()).get("accept-language") ?? "";
  const ranked = accept
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { code: tag.slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((l) => SUPPORTED.has(l.code) && !Number.isNaN(l.q))
    .sort((a, b) => b.q - a.q);
  return ranked[0]?.code ?? "en";
}
