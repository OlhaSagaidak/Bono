import { z } from "zod";

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 2000;

// Start and end arrive as UTC ISO strings: the form converts the organizer's
// local time in the browser (components/date-time-field.tsx), so the server
// never guesses a timezone.
const instant = (message: string) =>
  z.iso.datetime({ offset: true, message }).transform((s) => new Date(s));

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Give the event a title.").max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters.`),
    description: z
      .string()
      .overwrite((s) => s.replace(/\r\n?/g, "\n"))
      .trim()
      .min(1, "Describe the event.")
      .max(DESCRIPTION_MAX, `Keep the description under ${DESCRIPTION_MAX} characters.`),
    startsAt: instant("Choose when it starts."),
    endsAt: instant("Choose when it ends."),
    locationType: z.enum(["in_person", "online"], "Choose in person or online."),
    address: z.string().trim().max(200, "Keep the address under 200 characters."),
    onlineUrl: z.string().trim().max(500, "That link is too long."),
    capacity: z
      .string()
      .trim()
      .transform((s) => (s === "" ? null : Number(s)))
      .pipe(z.number().int("Capacity must be a whole number.").min(1, "Capacity must be at least 1.").max(100_000).nullable()),
    causes: z.array(z.string()).min(1, "Tag at least one cause.").transform((c) => [...new Set(c)]),
  })
  .superRefine((e, ctx) => {
    // Zod runs this even when other fields failed, so the dates may not be
    // Dates here: only compare them when both parsed.
    if (e.startsAt instanceof Date && e.endsAt instanceof Date) {
      if (e.endsAt <= e.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
      if (e.endsAt.getTime() - e.startsAt.getTime() > 14 * 86_400_000) {
        ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Events can last up to 14 days." });
      }
    }
    if (e.locationType === "in_person" && !e.address) ctx.addIssue({ code: "custom", path: ["address"], message: "Add the address." });
    if (e.locationType === "online") {
      const ok = z.url({ protocol: /^https?$/ }).safeParse(e.onlineUrl).success;
      if (!ok) ctx.addIssue({ code: "custom", path: ["onlineUrl"], message: "Add the link people join with (https://…)." });
    }
  });
