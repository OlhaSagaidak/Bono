// `npm run irs:load -- wa [or ...]`: loads eligible organizations from the IRS
// Exempt Organizations Business Master File extract (EO BMF) for the given
// states into irs_exempt_orgs. Public data from irs.gov, no account needed.
// Re-running a state replaces its rows. The data itself is never committed.
//
// Kept: SUBSECTION 03 (501(c)(3)), DEDUCTIBILITY 1 (contributions deductible),
// STATUS 01 (unconditional exemption). Code meanings: the EO BMF info sheet,
// https://www.irs.gov/pub/foia/ig/tege/eo-info.pdf

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { irsExemptOrgs } from "@/db/schema";

const states = process.argv.slice(2).map((s) => s.toLowerCase());
if (states.length === 0 || states.some((s) => !/^[a-z]{2}$/.test(s))) {
  console.error("Usage: npm run irs:load -- wa [or ...]   (two-letter state codes)");
  process.exit(1);
}

async function loadState(state: string) {
  const url = `https://www.irs.gov/pub/irs-soi/eo_${state}.csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed for ${state.toUpperCase()}: ${res.status} ${url}`);
  const lines = (await res.text()).split(/\r?\n/).filter(Boolean);

  // The file is plain comma-separated with no quoting (checked: every row has
  // the header's column count), so a split is enough. Columns come from the header.
  const header = lines[0].split(",");
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Column ${name} missing from ${url}; the IRS format may have changed.`);
    return i;
  };
  const [EIN, NAME, CITY, STATE, SUBSECTION, DEDUCTIBILITY, STATUS] = [
    "EIN", "NAME", "CITY", "STATE", "SUBSECTION", "DEDUCTIBILITY", "STATUS",
  ].map(col);

  const rows: (typeof irsExemptOrgs.$inferInsert)[] = [];
  let malformed = 0;
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    if (f.length !== header.length) {
      malformed++;
      continue;
    }
    if (f[SUBSECTION] !== "03" || f[DEDUCTIBILITY] !== "1" || f[STATUS] !== "01") continue;
    if (!/^\d{9}$/.test(f[EIN])) {
      malformed++;
      continue;
    }
    rows.push({ ein: f[EIN], name: f[NAME].trim(), city: f[CITY].trim(), state: f[STATE].trim() });
  }

  const stateCode = state.toUpperCase();
  await db.transaction(async (tx) => {
    await tx.delete(irsExemptOrgs).where(eq(irsExemptOrgs.state, stateCode));
    for (let i = 0; i < rows.length; i += 2000) {
      await tx.insert(irsExemptOrgs).values(rows.slice(i, i + 2000)).onConflictDoNothing();
    }
  });
  console.log(
    `${stateCode}: ${rows.length} eligible of ${lines.length - 1} organizations loaded` +
      (malformed ? ` (${malformed} malformed rows skipped)` : ""),
  );
}

async function main() {
  for (const state of states) await loadState(state);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
