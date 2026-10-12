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
import { checkUploadedImage, replaceImage } from "@/lib/images";
import { getCauses } from "./queries";
import { interestsSchema, nonprofitProfileSchema, sponsorProfileSchema } from "./validation";

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
  };
  const parsed = nonprofitProfileSchema.safeParse(values);
  const logo = await checkUploadedImage(formData.get("logo"));
  if (!parsed.success || logo.kind === "error") {
    const fieldErrors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
    return {
      fieldErrors: { ...fieldErrors, ...(logo.kind === "error" && { logo: [logo.message] }) },
      values,
    };
  }
  if (await unknownCauses(parsed.data.causes)) return { error: "Unknown cause selected.", values };

  const { causes, ...profile } = parsed.data;
  await db.transaction(async (tx) => {
    const existing = await tx.query.nonprofitProfiles.findFirst({
      where: eq(nonprofitProfiles.userId, userId),
      columns: { logoImageId: true },
    });
    const previousLogo = existing?.logoImageId ?? null;
    const logoImageId =
      logo.kind === "ok" ? await replaceImage(tx, userId, logo, previousLogo) : previousLogo;

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

  refreshAllPages();
  redirect(`/nonprofits/${userId}`);
}

export async function saveSponsorProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireRole("sponsor");
  if (!userId) return WRONG_ROLE;

  const values = { name: formText(formData, "name"), about: formText(formData, "about") };
  const parsed = sponsorProfileSchema.safeParse(values);
  const logo = await checkUploadedImage(formData.get("logo"));
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
    const previousLogo = existing?.logoImageId ?? null;
    const logoImageId =
      logo.kind === "ok" ? await replaceImage(tx, userId, logo, previousLogo) : previousLogo;

    await tx
      .insert(sponsorProfiles)
      .values({ userId, ...parsed.data, logoImageId })
      .onConflictDoUpdate({ target: sponsorProfiles.userId, set: { ...parsed.data, logoImageId } });
    await tx.execute(markOnboarded(userId));
  });

  refreshAllPages();
  redirect(`/sponsors/${userId}`);
}
