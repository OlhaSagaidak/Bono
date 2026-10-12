import { eq } from "drizzle-orm";
import { db } from "@/db";
import { demoEinRegistry, irsExemptOrgs } from "@/db/schema";

/** "12-3456789" or "123456789" -> "123456789"; anything else -> null. */
export function normalizeEin(input: string): string | null {
  const digits = input.trim().replace(/[\s-]/g, "");
  return /^\d{9}$/.test(digits) ? digits : null;
}

/** "123456789" -> "12-3456789", the way EINs are usually written. */
export const formatEin = (ein: string) => `${ein.slice(0, 2)}-${ein.slice(2)}`;

export type EinRecord = { ein: string; name: string; source: "irs" | "demo"; location?: string };

/**
 * Looks the EIN up in the IRS list of eligible tax-exempt organizations, then in
 * the labeled demo registry. The two can't overlap in practice: demo EINs use
 * the "00" prefix, which the IRS doesn't assign.
 */
export async function findEin(ein: string): Promise<EinRecord | null> {
  const irs = await db.query.irsExemptOrgs.findFirst({ where: eq(irsExemptOrgs.ein, ein) });
  if (irs) return { ein, name: irs.name, source: "irs", location: `${irs.city}, ${irs.state}` };
  const demo = await db.query.demoEinRegistry.findFirst({ where: eq(demoEinRegistry.ein, ein) });
  if (demo) return { ein, name: demo.name, source: "demo" };
  return null;
}

// Words that say nothing about which organization this is.
const NOISE = new Set(["THE", "INC", "INCORPORATED", "CORP", "CORPORATION", "CO", "LLC", "LTD", "OF", "AND"]);

function words(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w));
}

/**
 * Is the name on the profile consistent with the name on record? Deliberately
 * simple and one-directional: after ignoring case, punctuation and words like
 * "Inc" or "The", every word of the record's (legal) name must appear in the
 * profile name. The profile may add words, not drop them. The IRS file cuts
 * long names off, so the record's last word may be the start of a profile word.
 *   profile "Okanogan Regional Humane Society" ~ record "OKANOGAN REGIONAL HUMANE" -> yes
 *   profile "Open Pantry"                      ~ record "OPEN PANTRY INC"          -> yes
 *   profile "Paws"                             ~ record "PAWS HAVEN"               -> no
 */
export function namesMatch(profileName: string, recordName: string): boolean {
  const mine = words(profileName);
  const record = words(recordName);
  if (record.length === 0) return false;
  return record.every((w, i) => {
    const truncatable = i === record.length - 1 && w.length >= 3;
    return mine.some((m) => m === w || (truncatable && m.startsWith(w)));
  });
}
