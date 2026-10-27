"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { captureBoostAction } from "@/lib/boosts/actions";
import { captureDonationAction } from "@/lib/donations/actions";
import { formatCents } from "@/lib/donations/amounts";
import { captureCampaignFundingAction } from "@/lib/matching/actions";
import type { ReturnKind } from "@/lib/paypal/return-params";
import { captureVerificationFeeAction } from "@/lib/verification/actions";

const DECLINED = "Your payment method was declined. You weren't charged. Go back and try another one.";
const OFFLINE = "Couldn't reach Bono to confirm your payment. Please don't pay again: reload this page in a moment.";

type Outcome = { tone: "done" | "error"; title: string; text: string };

/**
 * Captures the approved order (each capture action re-checks the signed-in
 * owner and is safe to repeat), right after the page loads in the browser.
 */
export function ReturnStatus({
  kind,
  orderId,
  cancelled,
  backPath,
  nonprofitName,
}: {
  kind: ReturnKind;
  orderId: string;
  cancelled: boolean;
  backPath: string;
  nonprofitName: string | null;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(
    cancelled ? { tone: "error", title: "Payment cancelled", text: "You weren't charged." } : null,
  );
  const started = useRef(false);

  useEffect(() => {
    if (cancelled || started.current) return;
    started.current = true; // once, even when React runs effects twice in development
    confirm(kind, orderId, nonprofitName)
      .catch((): Outcome => ({ tone: "error", title: "Not confirmed yet", text: OFFLINE }))
      .then(setOutcome);
  }, [cancelled, kind, orderId, nonprofitName]);

  if (!outcome) {
    return (
      <p role="status" className="text-lg">
        Confirming your payment with PayPal…
      </p>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-bold">{outcome.title}</h1>
      <p role={outcome.tone === "error" ? "alert" : "status"}>{outcome.text}</p>
      <Link
        href={backPath}
        className="self-start rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
      >
        Continue
      </Link>
    </>
  );
}

async function confirm(kind: ReturnKind, orderId: string, nonprofitName: string | null): Promise<Outcome> {
  const failed = (text: string): Outcome => ({ tone: "error", title: "Payment not completed", text });
  switch (kind) {
    case "donation": {
      const r = await captureDonationAction(orderId);
      if ("declined" in r) return failed(DECLINED);
      if ("error" in r) return failed(r.error);
      const to = nonprofitName ?? "the nonprofit";
      const text =
        r.status === "pending"
          ? `PayPal is still processing your ${formatCents(r.amountCents)} donation to ${to}. It goes straight to them once it clears.`
          : `Your ${formatCents(r.amountCents)} donation went straight to ${to}. PayPal will email you a receipt.`;
      const match = r.match ? ` ${r.match.sponsorName} matched your gift with ${formatCents(r.match.amountCents)} more.` : "";
      return { tone: "done", title: "Thank you!", text: text + match };
    }
    case "fee": {
      const r = await captureVerificationFeeAction(orderId);
      if ("declined" in r) return failed(DECLINED);
      if ("error" in r) return failed(r.error);
      return r.verified
        ? { tone: "done", title: "You're verified!", text: "Your nonprofit is now visible to supporters, and you can start posting." }
        : { tone: "done", title: "Payment received", text: "PayPal is still processing the fee. Your page goes live as soon as it clears." };
    }
    case "campaign": {
      const r = await captureCampaignFundingAction(orderId);
      if ("declined" in r) return failed(DECLINED);
      if ("error" in r) return failed(r.error);
      return { tone: "done", title: "Campaign funded", text: "Your matching pool is ready. Donations that match it are matched from now on." };
    }
    case "boost": {
      const r = await captureBoostAction(orderId);
      if ("declined" in r) return failed(DECLINED);
      if ("error" in r) return failed(r.error);
      const until = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(r.endsAt));
      return { tone: "done", title: "Post boosted", text: `The post is boosted until ${until}, always labeled with your name.` };
    }
  }
}
