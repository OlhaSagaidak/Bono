"use client";

import { useEffect, useId, useRef, useState } from "react";
import { captureDonationAction, createDonationOrderAction } from "@/lib/donations/actions";
import { amountSchema, formatCents, PRESET_DOLLARS } from "@/lib/donations/amounts";
import { loadPayPal } from "@/lib/paypal/web-sdk";

type Props = {
  nonprofitId: string;
  nonprofitName: string;
  postId?: string;
  clientId: string;
  /** "small" sits in a post's footer; "large" on the nonprofit's profile. */
  size?: "small" | "large";
};

type Step =
  | { kind: "choose" }
  | { kind: "thanks"; amountCents: number; pending: boolean };

// Thrown inside the order promise so PayPal's session rejects with our message.
class DonationError extends Error {}

export function DonateButton({ nonprofitId, nonprofitName, postId, clientId, size = "small" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [opened, setOpened] = useState(false);

  const trigger =
    size === "large"
      ? "rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800"
      : "rounded-lg bg-emerald-700 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-800";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpened(true);
          dialogRef.current?.showModal();
        }}
        className={`${trigger} focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600`}
      >
        Donate
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpened(false)}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {/* Mounted only while open, so each opening starts fresh. */}
        {opened && (
          <DonateFlow
            titleId={titleId}
            nonprofitId={nonprofitId}
            nonprofitName={nonprofitName}
            postId={postId}
            clientId={clientId}
            onClose={() => dialogRef.current?.close()}
          />
        )}
      </dialog>
    </>
  );
}

function DonateFlow({
  titleId,
  nonprofitId,
  nonprofitName,
  postId,
  clientId,
  onClose,
}: Omit<Props, "size"> & { titleId: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [choice, setChoice] = useState<string>("25"); // a preset, or "other"
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [paypal, setPayPal] = useState<"loading" | "ready" | "unavailable">("loading");
  const sessionRef = useRef<PayPalOneTimePaymentSession | null>(null);

  const rawAmount = choice === "other" ? custom : choice;
  const amount = amountSchema.safeParse(rawAmount);

  // Load PayPal once the dialog opens, check the donor can pay with it, and
  // set up the payment session. Its callbacks only use setters and refs, so
  // one session serves every attempt in this dialog.
  useEffect(() => {
    let cancelled = false;
    loadPayPal(clientId)
      .then(async (sdk) => {
        const eligibility = await sdk.findEligibleMethods({ currencyCode: "USD" });
        if (cancelled) return;
        if (!eligibility.isEligible("paypal")) return setPayPal("unavailable");
        sessionRef.current = sdk.createPayPalOneTimePaymentSession({
          async onApprove({ orderId }) {
            setMessage({ tone: "info", text: "Confirming your donation…" });
            const result = await captureDonationAction(orderId);
            if ("declined" in result) {
              setMessage({ tone: "error", text: "Your payment method was declined. Try another one." });
            } else if ("error" in result) {
              setMessage({ tone: "error", text: result.error });
            } else {
              setMessage(null);
              setStep({ kind: "thanks", amountCents: result.amountCents, pending: result.status === "pending" });
            }
          },
          onCancel() {
            setMessage({ tone: "info", text: "Payment cancelled. You weren't charged." });
          },
          onError() {
            setMessage((current) =>
              current?.tone === "error"
                ? current // keep our own, more specific message
                : { tone: "error", text: "PayPal ran into a problem. You weren't charged. Please try again." },
            );
          },
        });
        setPayPal("ready");
      })
      .catch(() => !cancelled && setPayPal("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function pay() {
    const session = sessionRef.current;
    if (!session || !amount.success) return;
    setMessage(null);
    // Not awaited before start(): the PayPal window has to open inside this click.
    const order = createDonationOrderAction({ nonprofitId, postId: postId ?? null, amount: rawAmount }).then(
      (result) => {
        if ("error" in result) throw new DonationError(result.error);
        return { orderId: result.orderId };
      },
    );
    try {
      await session.start({ presentationMode: "auto" }, order);
    } catch {
      const reason = await order.then(
        () => null,
        (e: unknown) => (e instanceof DonationError ? e.message : null),
      );
      setMessage({ tone: "error", text: reason ?? "PayPal ran into a problem. You weren't charged. Please try again." });
    }
  }

  if (step.kind === "thanks") {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-xl font-bold">
          Thank you!
        </h2>
        <p role="status">
          {step.pending
            ? `PayPal is still processing your ${formatCents(step.amountCents)} donation to ${nonprofitName}. It goes straight to them once it clears.`
            : `Your ${formatCents(step.amountCents)} donation went straight to ${nonprofitName}. PayPal will email you a receipt.`}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="self-end rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
        >
          Done
        </button>
      </div>
    );
  }

  const amountError = !amount.success && (choice !== "other" || custom !== "") ? amount.error.issues[0]?.message : undefined;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-xl font-bold">
          Donate to {nonprofitName}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-m-2 rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Amount (USD)</legend>
        <div className="flex flex-wrap gap-2">
          {[...PRESET_DOLLARS.map(String), "other"].map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-700 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-600 dark:border-zinc-700"
            >
              <input
                type="radio"
                name="amount"
                value={value}
                checked={choice === value}
                onChange={() => setChoice(value)}
                className="sr-only"
              />
              {value === "other" ? "Other" : `$${value}`}
            </label>
          ))}
        </div>
        {choice === "other" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="custom-amount" className="text-sm font-medium">
              Your amount ($1 to $10,000)
            </label>
            <input
              id="custom-amount"
              inputMode="decimal"
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. 15"
              aria-invalid={amountError ? true : undefined}
              aria-describedby={amountError ? "custom-amount-error" : undefined}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900"
            />
            {amountError && (
              <p id="custom-amount-error" className="text-sm text-red-700 dark:text-red-400">
                {amountError}
              </p>
            )}
          </div>
        )}
      </fieldset>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Your donation goes directly to {nonprofitName}&apos;s PayPal account. Bono never holds it.
      </p>

      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={
            message.tone === "error"
              ? "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
              : "rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800"
          }
        >
          {message.text}
        </p>
      )}

      {paypal === "loading" && <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading PayPal…</p>}
      {paypal === "unavailable" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          PayPal isn&apos;t available right now. Please try again later.
        </p>
      )}
      {/* PayPal's own branded button; hidden until the SDK is ready and the amount is valid. */}
      <paypal-button
        hidden={paypal !== "ready" || !amount.success}
        onClick={pay}
        className="block w-full"
      ></paypal-button>
    </div>
  );
}
