"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  nonprofitCauses,
  nonprofitProfiles,
  sponsorProfiles,
  userInterests,
  users,
  type Role,
} from "@/db/schema";
import { formText, type FormState } from "@/lib/forms";
import { applyPhotoChange, photoChange } from "@/lib/images";
import { resetUserVector } from "@/lib/feed/learn";
import { completeVerificationIfReady } from "@/lib/verification/queries";
import { getCauses } from "./queries";
import { interestsSchema, nonprofitProfileSchema, sponsorProfileSchema, supporterProfileSchema } from "./validation";

// Server Actions are public endpoints, so each one re-checks who is calling.
async function requireRole(role: Role) {
  const session = await auth();
  if (!session) redirect("/login");
  return session.user.role === role ? session.user.id : null;
}

const WRONG_ROLE: FormState = { error: "This form isn't for your account type." };

async function unknownCauses(slugs: string[]) {
  const known = new Set((await getCauses()).map((c) => c.slug));
  return slugs.some((s) => !known.has(s));
}

const markOnboarded = (userId: string) =>
  sql`UPDATE ${users} SET onboarded_at = coalesce(onboarded_at, now()) WHERE id = ${userId}`;

// The header in the root layout shows different links once onboarding is done,
// and names/logos appear on many pages. Layouts don't re-render on navigation,
// so refresh everything after a profile save.
const refreshAllPages = () => revalidatePath("/", "layout");

export async function saveInterestsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireRole("user");
  if (!userId) return WRONG_ROLE;

  const values = { causes: formData.getAll("causes").map(String) };
  const parsed = interestsSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (await unknownCauses(parsed.data.causes)) return { error: "Unknown cause selected.", values };

  await db.transaction(async (tx) => {
    await tx.delete(userInterests).where(eq(userInterests.userId, userId));
    await tx
      .insert(userInterests)
      .values(parsed.data.causes.map((causeSlug) => ({ userId, causeSlug })));
    await tx.execute(markOnboarded(userId));
  });
  // New causes, new starting point for the feed.
  await resetUserVector(userId);

  refreshAllPages();
  redirect("/feed");
}

export async function saveNonprofitProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireRole("nonprofit");
  if (!userId) return WRONG_ROLE;

  const values = {
    name: formText(formData, "name"),
    mission: formText(formData, "mission"),
    paypalPayeeEmail: formText(formData, "paypalPayeeEmail"),
    causes: formData.getAll("causes").map(String),
    bio: formText(formData, "bio"),
  };
  const parsed = nonprofitProfileSchema.safeParse(values);
  const logo = await photoChange(formData, "logo", "removeLogo");
  if (!parsed.success || logo.kind === "error") {
    const fieldErrors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
    return {
      fieldErrors: { ...fieldErrors, ...(logo.kind === "error" && { logo: [logo.message] }) },
      values,
    };
  }
  if (await unknownCauses(parsed.data.causes)) return { error: "Unknown cause selected.", values };

  const { causes, bio, ...profile } = parsed.data;

  // Verification proved this PayPal account belongs to the nonprofit, so a
  // verified nonprofit can't silently redirect donations elsewhere.
  const current = await db.query.nonprofitProfiles.findFirst({
    where: eq(nonprofitProfiles.userId, userId),
    columns: { verifiedAt: true, paypalPayeeEmail: true },
  });
  if (current?.verifiedAt && current.paypalPayeeEmail !== profile.paypalPayeeEmail) {
    return {
      fieldErrors: {
        paypalPayeeEmail: ["Your PayPal email is locked after verification. Contact Bono to change it."],
      },
      values,
    };
  }

  await db.transaction(async (tx) => {
    const existing = await tx.query.nonprofitProfiles.findFirst({
      where: eq(nonprofitProfiles.userId, userId),
      columns: { logoImageId: true },
    });
    const logoImageId = await applyPhotoChange(tx, userId, logo, existing?.logoImageId ?? null);
    await tx.update(users).set({ bio }).where(eq(users.id, userId));

    await tx
      .insert(nonprofitProfiles)
      .values({ userId, ...profile, logoImageId })
      .onConflictDoUpdate({ target: nonprofitProfiles.userId, set: { ...profile, logoImageId } });
    await tx.delete(nonprofitCauses).where(eq(nonprofitCauses.nonprofitId, userId));
    await tx
      .insert(nonprofitCauses)
      .values(causes.map((causeSlug) => ({ nonprofitId: userId, causeSlug })));
    await tx.execute(markOnboarded(userId));
  });

  // Its causes seed its own feed too.
  await resetUserVector(userId);
  // A nonprofit whose fee came from another PayPal account finishes here by
  // switching its donation email to that account.
  await completeVerificationIfReady(userId);
  refreshAllPages();
  redirect(`/nonprofits/${userId}`);
}

export async function saveSponsorProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireRole("sponsor");
  if (!userId) return WRONG_ROLE;

  const values = { name: formText(formData, "name"), bio: formText(formData, "bio") };
  const parsed = sponsorProfileSchema.safeParse(values);
  const logo = await photoChange(formData, "logo", "removeLogo");
  if (!parsed.success || logo.kind === "error") {
    const fieldErrors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
    return {
      fieldErrors: { ...fieldErrors, ...(logo.kind === "error" && { logo: [logo.message] }) },
      values,
    };
  }

  await db.transaction(async (tx) => {
    const existing = await tx.query.sponsorProfiles.findFirst({
      where: eq(sponsorProfiles.userId, userId),
      columns: { logoImageId: true },
    });
    const logoImageId = await applyPhotoChange(tx, userId, logo, existing?.logoImageId ?? null);
    const { name, bio } = parsed.data;
    await tx.update(users).set({ bio }).where(eq(users.id, userId));

    await tx
      .insert(sponsorProfiles)
      .values({ userId, name, logoImageId })
      .onConflictDoUpdate({ target: sponsorProfiles.userId, set: { name, logoImageId } });
    await tx.execute(markOnboarded(userId));
  });

  refreshAllPages();
  redirect(`/sponsors/${userId}`);
}

/** A supporter's own profile: name, bio and photo. Only ever the signed-in supporter's. */
export async function saveSupporterProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireRole("user");
  if (!userId) return WRONG_ROLE;

  const values = { name: formText(formData, "name"), bio: formText(formData, "bio") };
  const parsed = supporterProfileSchema.safeParse(values);
  const photo = await photoChange(formData, "photo", "removePhoto");
  if (!parsed.success || photo.kind === "error") {
    const fieldErrors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
    return { fieldErrors: { ...fieldErrors, ...(photo.kind === "error" && { photo: [photo.message] }) }, values };
  }

  await db.transaction(async (tx) => {
    const [current] = await tx.select({ avatarImageId: users.avatarImageId }).from(users).where(eq(users.id, userId));
    const avatarImageId = await applyPhotoChange(tx, userId, photo, current?.avatarImageId ?? null);
    await tx.update(users).set({ ...parsed.data, avatarImageId }).where(eq(users.id, userId));
  });

  refreshAllPages();
  redirect(`/users/${userId}`);
}
