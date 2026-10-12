import { z } from "zod";
import { roleEnum } from "@/db/schema";

const email = z.email("Enter a valid email address.").trim().toLowerCase();

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Name is too long."),
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."), // bcrypt ignores bytes past 72
  role: z.enum(roleEnum.enumValues, "Choose how you'll use Bono."),
});
