// The EIN rules, free of database and network code so they are easy to test.

/** "12-3456789" or "123456789" -> "123456789"; anything else -> null. */
export function normalizeEin(input: string): string | null {
  const digits = input.trim().replace(/[\s-]/g, "");
  return /^\d{9}$/.test(digits) ? digits : null;
}

/** "123456789" -> "12-3456789", the way EINs are usually written. */
export const formatEin = (ein: string) => `${ein.slice(0, 2)}-${ein.slice(2)}`;

/** How long an organization must have been tax-exempt before Bono verifies it. */
export const MIN_EXEMPT_MONTHS = 6;

/** The first day an organization ruled tax-exempt on `rulingDate` may be verified ("YYYY-MM-DD"). */
export function verifiableFrom(rulingDate: string): string {
  const [y, m, d] = rulingDate.split("-").map(Number);
  const month = m - 1 + MIN_EXEMPT_MONTHS;
  // Aug 30 + 6 months is Feb 28 (or 29), not "Feb 30", which Date would roll into March.
  const lastDay = new Date(Date.UTC(y, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, month, Math.min(d, lastDay))).toISOString().slice(0, 10);
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
