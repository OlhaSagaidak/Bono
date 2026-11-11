import { z } from "zod";
import { COVER_TEXT_MAX } from "@/components/cover-text";

export const BODY_MAX = 2000;
export const GOAL_TITLE_MAX = 60;
export const GOAL_MAX_DOLLARS = 1_000_000;
export const ALT_MAX = 300;
export { COVER_TEXT_MAX };

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
  coverText: z.string().trim().max(COVER_TEXT_MAX, `Keep the text on the photo under ${COVER_TEXT_MAX} characters.`),
  coverTextPosition: z.enum(["top", "middle", "bottom"]).catch("middle"),
  // A fundraising goal is optional, but a title without an amount (or the
  // reverse) is a mistake, so both are checked together below.
  goalTitle: z.string().trim().max(GOAL_TITLE_MAX, `Keep the goal title under ${GOAL_TITLE_MAX} characters.`),
  goalDollars: z
    .string()
    .trim()
    .transform((s) => s.replace(/^\$/, "").replace(/,/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^\d+$/, "Enter the goal in whole dollars, like 2400.")])),
}).superRefine((v, ctx) => {
  if (v.goalDollars && !v.goalTitle) ctx.addIssue({ code: "custom", path: ["goalTitle"], message: "Say what the goal is for." });
  if (v.goalTitle && !v.goalDollars) ctx.addIssue({ code: "custom", path: ["goalDollars"], message: "Enter the amount you're raising." });
  if (v.goalDollars && (Number(v.goalDollars) < 1 || Number(v.goalDollars) > GOAL_MAX_DOLLARS))
    ctx.addIssue({ code: "custom", path: ["goalDollars"], message: `Goals go from $1 to $${GOAL_MAX_DOLLARS.toLocaleString("en-US")}.` });
});
