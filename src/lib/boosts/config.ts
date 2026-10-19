import "server-only";

/** What a boost costs and how long it lasts. Configurable; $15 for 7 days by default. */
export function boostTerms(): { feeCents: number; days: number } {
  const feeCents = Number(process.env.BOOST_FEE_CENTS ?? 1500);
  const days = Number(process.env.BOOST_DAYS ?? 7);
  if (!Number.isInteger(feeCents) || feeCents < 100) throw new Error("BOOST_FEE_CENTS must be a whole number of cents, at least 100.");
  if (!Number.isInteger(days) || days < 1 || days > 60) throw new Error("BOOST_DAYS must be a whole number from 1 to 60.");
  return { feeCents, days };
}
