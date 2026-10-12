"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signInSchema, signUpSchema } from "./validation";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
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
    return { fieldErrors: { email: ["An account with this email already exists. Log in instead."] } };
  }

  return signInOrError(email, password);
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  return signInOrError(parsed.data.email, parsed.data.password);
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

async function signInOrError(email: string, password: string): Promise<FormState> {
  try {
    // On success this throws Next's redirect, which must propagate.
    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "That email and password don't match. Try again." };
    }
    throw error;
  }
}
