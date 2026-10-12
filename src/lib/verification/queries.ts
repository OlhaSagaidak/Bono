import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { nonprofitProfiles, verificationFees } from "@/db/schema";

/** The latest fee this nonprofit has actually paid (money moved), if any. */
export function getPaidFee(nonprofitId: string) {
  return db.query.verificationFees.findFirst({
    where: and(eq(verificationFees.nonprofitId, nonprofitId), eq(verificationFees.status, "completed")),
    orderBy: desc(verificationFees.completedAt),
  });
}

/**
 * Verification completes when the EIN check passed AND a paid fee came from
 * the same PayPal account donations go to. Called after a fee is captured and
 * after the nonprofit edits its profile (it may switch to the paying account).
 * Returns whether the nonprofit is now verified.
 */
export async function completeVerificationIfReady(nonprofitId: string): Promise<boolean> {
  const profile = await db.query.nonprofitProfiles.findFirst({
    where: eq(nonprofitProfiles.userId, nonprofitId),
    columns: { verifiedAt: true, ein: true, paypalPayeeEmail: true },
  });
  if (!profile) return false;
  if (profile.verifiedAt) return true;
  if (!profile.ein) return false;

  const fee = await getPaidFee(nonprofitId);
  if (!fee?.payerEmail || fee.payerEmail !== profile.paypalPayeeEmail.toLowerCase()) return false;

  await db
    .update(nonprofitProfiles)
    .set({ verifiedAt: new Date() })
    .where(eq(nonprofitProfiles.userId, nonprofitId));
  return true;
}
