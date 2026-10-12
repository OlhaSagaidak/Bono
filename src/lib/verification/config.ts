import "server-only";

/** The one-time verification fee in cents. Configurable; $25 by default. */
export function verificationFeeCents(): number {
  const raw = process.env.VERIFICATION_FEE_CENTS;
  if (!raw) return 2500;
  const cents = Number(raw);
  if (!Number.isInteger(cents) || cents < 100) throw new Error("VERIFICATION_FEE_CENTS must be a whole number of cents, at least 100.");
  return cents;
}

/** Bono's own PayPal account (sandbox Business), which receives verification fees. */
export function platformPayeeEmail(): string {
  const email = process.env.PAYPAL_PLATFORM_MERCHANT_EMAIL;
  if (!email) throw new Error("PAYPAL_PLATFORM_MERCHANT_EMAIL must be set (the platform's sandbox Business account).");
  return email;
}
