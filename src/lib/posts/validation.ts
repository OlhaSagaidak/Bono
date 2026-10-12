import { z } from "zod";

export const BODY_MAX = 2000;
export const ALT_MAX = 300;

// The languages the demo posts in. Adding one here is all the form needs.
export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "uk", label: "Ukrainian" },
] as const;
const languageCodes = LANGUAGES.map((l) => l.value) as [string, ...string[]];

// Cause slugs are checked against the nonprofit's own causes in the action.
export const postSchema = z.object({
  body: z
    .string()
    // Browsers submit textarea line breaks as \r\n; store plain \n so the
    // length check matches the textarea's own maxLength count.
    .overwrite((s) => s.replace(/\r\n?/g, "\n"))
    .trim()
    .min(1, "Write something for your supporters.")
    .max(BODY_MAX, `Keep posts under ${BODY_MAX} characters.`),
  language: z.enum(languageCodes, "Choose the language the post is written in."),
  causes: z
    .array(z.string())
    .min(1, "Tag at least one cause.")
    .transform((slugs) => [...new Set(slugs)]),
  imageAlt: z.string().trim().max(ALT_MAX, `Keep the description under ${ALT_MAX} characters.`),
});
