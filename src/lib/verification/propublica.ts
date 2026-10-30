import "server-only";

// The IRS record for an EIN, looked up when a nonprofit asks to be verified,
// from ProPublica's Nonprofit Explorer API (free, no account or key; built on
// the IRS Exempt Organizations Business Master File, which the IRS publishes
// monthly). Asking at the moment of verification means every check uses the
// latest published record for any state, with nothing stored or reloaded.
// ProPublica's data terms: free to use, cite ProPublica, don't resell.

const API = "https://projects.propublica.org/nonprofits/api/v2/organizations";
const TIMEOUT_MS = 8_000;

export type IrsRecord = {
  name: string;
  city: string;
  state: string;
  /** When the IRS recognized the exemption ("YYYY-MM-DD"), if known. */
  rulingDate: string | null;
  /** 501(c)(3), donations tax-deductible, unconditional exemption: what Bono accepts. */
  eligible: boolean;
};

type Organization = {
  name?: string;
  city?: string;
  state?: string;
  ruling_date?: string | null;
  subsection_code?: number | null;
  deductibility_code?: number | null;
  exempt_organization_status_code?: number | null;
};

/** The record, null if the IRS has no such EIN, or "unavailable" if ProPublica couldn't be reached. */
export async function lookUpIrsRecord(ein: string): Promise<IrsRecord | null | "unavailable"> {
  let response: Response;
  try {
    response = await fetch(`${API}/${ein}.json`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    console.error("ProPublica lookup failed:", error instanceof Error ? error.message : error);
    return "unavailable";
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    console.error(`ProPublica lookup answered ${response.status}`);
    return "unavailable";
  }
  let org: Organization | undefined;
  try {
    org = ((await response.json()) as { organization?: Organization }).organization;
  } catch {
    return "unavailable";
  }
  // ProPublica answers some EINs it only knows from other filings with a
  // placeholder ("Unknown Organization", every IRS field empty). Those aren't
  // in the IRS exempt-organizations file, so they're "not found".
  if (!org?.name || org.subsection_code == null) return null;
  return {
    name: org.name,
    city: org.city ?? "",
    state: org.state ?? "",
    rulingDate: /^\d{4}-\d{2}-\d{2}$/.test(org.ruling_date ?? "") && !org.ruling_date!.startsWith("0000") ? org.ruling_date! : null,
    eligible: org.subsection_code === 3 && org.deductibility_code === 1 && org.exempt_organization_status_code === 1,
  };
}
