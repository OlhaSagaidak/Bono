import { franc } from "franc-min";

// Which of Bono's languages a comment is written in, so people reading in
// another language get "See translation". Unlike posts, comments don't ask
// the writer; franc (free, offline, open source) guesses from letter
// patterns. Short texts ("Thanks!") are too short to tell: no button then.

const CODES = { eng: "en", spa: "es", ukr: "uk" } as const;

export function detectLanguage(text: string): "en" | "es" | "uk" | null {
  // Cyrillic letters only appear in Ukrainian among Bono's languages, and a
  // mixed comment ("Дякую! Can I help?") still needs translating for others.
  if ((text.match(/[Ѐ-ӿ]/g) ?? []).length >= 3) return "uk";
  const code = franc(text, { only: Object.keys(CODES) });
  return code in CODES ? CODES[code as keyof typeof CODES] : null;
}
