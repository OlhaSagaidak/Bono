"use client";

import { useId, useRef, useState } from "react";
import { PayPalCheckout } from "@/components/paypal-checkout";
import { captureBoostAction, createBoostOrderAction } from "@/lib/boosts/actions";

const usd = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** Sponsors: pay a fixed fee to boost a post for a few days, clearly labeled. */
export function BoostButton({
  postId,
  nonprofitName,
  feeCents,
  days,
  clientId,
}: {
  postId: string;
  nonprofitName: string;
  feeCents: number;
  days: number;
  clientId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [boostedUntil, setBoostedUntil] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
        className="rounded-lg border border-zinc-300 px-3 py-1 text-sm font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Boost
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {open && (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-xl font-bold">
                {boostedUntil ? "Boost is live" : `Boost this post by ${nonprofitName}`}
              </h2>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close"
                className="-m-2 rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>
            {boostedUntil ? (
              <p role="status">
                The post ranks higher in feeds, labeled with your name, until {dateFormat.format(new Date(boostedUntil))}.
                Results show on your Campaigns page.
              </p>
            ) : (
              <>
                <p>
                  {usd(feeCents)} for {days} days, paid to Bono. The post ranks higher in supporters&apos; feeds and always
                  carries the label <strong>Boosted by</strong> your name. The donations still go straight to {nonprofitName}.
                </p>
                <PayPalCheckout
                  clientId={clientId}
                  createOrder={({ redirect }) => createBoostOrderAction(postId, { redirect })}
                  onApprove={async (orderId) => {
                    const result = await captureBoostAction(orderId);
                    if ("declined" in result) return "Your payment method was declined. Try another one.";
                    if ("error" in result) return result.error;
                    setBoostedUntil(result.endsAt);
                    return null;
                  }}
                />
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
