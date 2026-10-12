import { z } from "zod";

export const MISSION_MAX = 500;
export const ABOUT_MAX = 300;

// Cause slugs are checked against the causes table in the action; here we only
// shape them. getAll() is used because checkbox groups repeat the same name.
const causeSlugs = (min: number, max: number, tooFew: string, tooMany: string) =>
  z.array(z.string()).min(min, tooFew).max(max, tooMany);

export const interestsSchema = z.object({
  causes: causeSlugs(1, 7, "Pick at least one cause.", "Too many causes."),
});

export const nonprofitProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter your organization's name.").max(100, "Name is too long."),
  mission: z
    .string()
    .trim()
    .min(1, "Tell supporters what you do.")
    .max(MISSION_MAX, `Keep the mission under ${MISSION_MAX} characters.`),
  causes: causeSlugs(1, 3, "Pick at least one cause.", "Pick up to 3 causes."),
  paypalPayeeEmail: z.email("Enter the email of your PayPal Business account.").trim().toLowerCase(),
});

export const sponsorProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter your company's name.").max(100, "Name is too long."),
  about: z.string().trim().max(ABOUT_MAX, `Keep this under ${ABOUT_MAX} characters.`),
});
