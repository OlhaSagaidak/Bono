import { z } from "zod";
import { amountSchema } from "@/lib/donations/amounts";

export const RATIOS = [
  { value: "50", label: "0.5 : 1 (50¢ per $1)" },
  { value: "100", label: "1 : 1 (dollar for dollar)" },
  { value: "200", label: "2 : 1 ($2 per $1)" },
] as const;

const date = (message: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message).transform((s) => new Date(`${s}T00:00:00Z`));

export const campaignSchema = z
  .object({
    name: z.string().trim().min(1, "Give the campaign a name.").max(80, "Keep the name under 80 characters."),
    target: z.enum(["cause", "nonprofits"], "Choose what the campaign matches."),
    causeSlug: z.string(),
    nonprofitIds: z.array(z.uuid()),
    ratioPercent: z.enum(RATIOS.map((r) => r.value) as [string, ...string[]], "Choose a match ratio.").transform(Number),
    capCents: amountSchema,
    poolCents: amountSchema.pipe(z.number().min(1_000, "The smallest pool is $10.")),
    startsAt: date("Choose a start date."),
    endsAt: date("Choose an end date."),
  })
  .superRefine((c, ctx) => {
    if (c.target === "cause" && !c.causeSlug) ctx.addIssue({ code: "custom", path: ["causeSlug"], message: "Choose a cause." });
    if (c.target === "nonprofits" && c.nonprofitIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["nonprofitIds"], message: "Choose at least one nonprofit." });
    }
    if (c.endsAt <= c.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end date must be after the start date." });
    if (c.capCents > c.poolCents) ctx.addIssue({ code: "custom", path: ["capCents"], message: "The cap can't be more than the whole pool." });
  });
