"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { formText, type FormState } from "@/lib/forms";
import { signInSchema, signUpSchema } from "./validation";

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { name: formText(formData, "name"), email: formText(formData, "email"), role: formText(formData, "role") };
  const parsed = signUpSchema.safeParse({ ...values, password: formText(formData, "password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const { name, email, password, role } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);
  // The unique constraint, not a prior lookup, decides: two sign-ups racing
  // for the same email can't both succeed.
  const inserted = await db
    .insert(users)
    .values({ name, email, passwordHash, role })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (inserted.length === 0) {
    return { fieldErrors: { email: ["An account with this email already exists. Log in instead."] }, values };
  }

  // New accounts go straight to their role's profile setup.
  return signInOrError(email, password, "/onboarding");
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: formText(formData, "email") };
  const parsed = signInSchema.safeParse({ ...values, password: formText(formData, "password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const state = await signInOrError(parsed.data.email, parsed.data.password, "/");
  return { ...state, values };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

async function signInOrError(email: string, password: string, redirectTo: string): Promise<FormState> {
  try {
    // On success this throws Next's redirect, which must propagate.
    await signIn("credentials", { email, password, redirectTo });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "That email and password don't match. Try again." };
    }
    throw error;
  }
}
