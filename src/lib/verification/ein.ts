import { eq } from "drizzle-orm";
import { db } from "@/db";
import { demoEinRegistry } from "@/db/schema";
import { lookUpIrsRecord } from "./propublica";

export { formatEin, MIN_EXEMPT_MONTHS, namesMatch, normalizeEin, verifiableFrom } from "./ein-rules";

export type EinRecord = {
  ein: string;
  name: string;
  source: "irs" | "demo";
  location?: string;
  /** When it was recognized as tax-exempt ("YYYY-MM-DD"), if known. */
  rulingDate: string | null;
  /** IRS records only: a 501(c)(3) Bono accepts (see lookUpIrsRecord). */
  eligible: boolean;
};

/**
 * Looks the EIN up in the labeled demo registry, then in the IRS records (on
 * demand, through ProPublica). The two can't overlap: demo EINs use the "00"
 * prefix, which the IRS doesn't assign. "unavailable": the IRS records
 * couldn't be reached, which is not the same as "not found".
 */
export async function findEin(ein: string): Promise<EinRecord | null | "unavailable"> {
  const demo = await db.query.demoEinRegistry.findFirst({ where: eq(demoEinRegistry.ein, ein) });
  if (demo) return { ein, name: demo.name, source: "demo", rulingDate: demo.rulingDate, eligible: true };
  if (ein.startsWith("00")) return null; // never an IRS EIN, so don't ask
  const irs = await lookUpIrsRecord(ein);
  if (irs === null || irs === "unavailable") return irs;
  return {
    ein,
    name: irs.name,
    source: "irs",
    location: [irs.city, irs.state].filter(Boolean).join(", "),
    rulingDate: irs.rulingDate,
    eligible: irs.eligible,
  };
}

