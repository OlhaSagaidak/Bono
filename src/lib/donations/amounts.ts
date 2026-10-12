import { z } from "zod";

// Shared by the Donate dialog (to render choices) and the server (to validate).
// The server never trusts the browser's number: it re-parses and re-checks it.
export const PRESET_DOLLARS = [10, 25, 50, 100] as const;
export const MIN_CENTS = 100; // $1
export const MAX_CENTS = 1_000_000; // $10,000

/** Accepts "25", "25.5" or "25.50" (an optional leading $ too) and returns integer cents. */
export const amountSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/^\$/, ""))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount in dollars, like 25 or 12.50."))
  .transform((s) => Math.round(Number(s) * 100))
  .pipe(
    z
      .number()
      .min(MIN_CENTS, "The smallest donation is $1.")
      .max(MAX_CENTS, "The largest donation here is $10,000."),
  );

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 2500 -> "$25.00", 2550 -> "$25.50" */
export const formatCents = (cents: number) => usd.format(cents / 100).replace(/\.00$/, "");
