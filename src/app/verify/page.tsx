import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { formatCents } from "@/lib/donations/amounts";
import { payPalClientId } from "@/lib/paypal/public-config";
import { getNonprofitProfile } from "@/lib/profiles/queries";
import { verificationFeeCents } from "@/lib/verification/config";
import { findEin, formatEin } from "@/lib/verification/ein";
import { getPaidFee } from "@/lib/verification/queries";
import { EinForm, FeeCheckout } from "./verify-forms";

export const metadata = { title: "Get verified · Bono" };

const link = "font-medium text-emerald-700 underline dark:text-emerald-400";

export default function VerifyPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-bold">Get verified</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Verify />
      </Suspense>
    </main>
  );
}

// One page for every stage: check the EIN, pay the fee, fix a payer mismatch, done.
async function Verify() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "nonprofit") redirect("/feed");
  const profile = await getNonprofitProfile(session.user.id);
  if (!profile) redirect("/onboarding");

  if (profile.verifiedAt) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <strong>You&apos;re verified.</strong> Your page is live and supporters can donate to you.
        </p>
        <p className="flex gap-4">
          <Link href={`/nonprofits/${profile.userId}`} className={link}>
            View your page
          </Link>
          <Link href="/posts/new" className={link}>
            Write a post
          </Link>
        </p>
      </div>
    );
  }

  const intro = (
    <p className="text-zinc-600 dark:text-zinc-400">
      Bono only shows supporters organizations whose tax-exempt status has been checked. It takes two steps: your EIN,
      then a one-time {formatCents(verificationFeeCents())} fee paid through PayPal.
    </p>
  );

  if (!profile.ein) {
    return (
      <>
        {intro}
        <h2 className="text-lg font-semibold">Step 1 of 2: your EIN</h2>
        <EinForm />
      </>
    );
  }

  const record = await findEin(profile.ein);
  const fee = await getPaidFee(profile.userId);

  return (
    <>
      {intro}
      <section className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-semibold">Step 1 of 2: EIN checked ✓</h2>
        <p>
          {formatEin(profile.ein)} · {record?.name ?? profile.name}
          {record?.location && ` · ${record.location}`}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {profile.einSource === "demo"
            ? "Found in Bono's demo registry: fictional EINs for the demo and test nonprofits (including the judge test entries), not IRS data."
            : "Found in the IRS list of tax-exempt organizations (Exempt Organizations Business Master File)."}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Step 2 of 2: verification fee</h2>
        {fee ? (
          <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Your fee is paid, but it came from the PayPal account <strong>{fee.payerEmail ?? "(not reported by PayPal)"}</strong>,
            while donations are set to go to <strong>{profile.paypalPayeeEmail}</strong>. Verification needs them to be
            the same account, so we know donations reach you. If the paying account is yours,{" "}
            <Link href="/onboarding" className={link}>
              change your donation PayPal email
            </Link>{" "}
            to it, and verification completes. You won&apos;t be charged again.
          </p>
        ) : (
          <>
            <p>
              Pay {formatCents(verificationFeeCents())} once, to Bono, <strong>from the PayPal account you&apos;ll
              receive donations in</strong>: {profile.paypalPayeeEmail}. That proves the account is real and yours.
            </p>
            <FeeCheckout clientId={payPalClientId()} />
          </>
        )}
      </section>
    </>
  );
}
