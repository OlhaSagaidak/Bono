"use client";

import { useEffect, useRef, useState } from "react";
import { loadPayPal } from "@/lib/paypal/web-sdk";

type Props = {
  clientId: string;
  /** Hide the button, e.g. while the chosen amount is invalid. */
  disabled?: boolean;
  /**
   * Creates the order on our server. Called inside the button click. With
   * `redirect` (phones), the server adds return URLs and answers with the
   * PayPal page to send the buyer to (approveUrl).
   */
  createOrder: (options: { redirect: boolean }) => Promise<{ orderId: string; approveUrl?: string } | { error: string }>;
  /** Captures on our server after the payer approves. Returns a message to show, or null on success. */
  onApprove: (orderId: string) => Promise<string | null>;
};

const PAYPAL_PROBLEM = "PayPal ran into a problem. You weren't charged. Please try again.";

/**
 * How checkout opens. Laptops: PayPal's popup ("auto"), which reports back
 * to this page. Phones and tablets: a full-page redirect in the same tab,
 * PayPal's recommendation for mobile. The popup there opened as a new tab
 * that iOS handed to the PayPal app (real accounts only, so sandbox payments
 * failed), and the in-page "modal" never reported the approval back (PayPal
 * documents it for app WebViews only). See pay-pal-server-sdk-plan.md, slice 5.
 */
function usesRedirect(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

// Thrown inside the order promise so PayPal's session rejects with our message.
class OrderError extends Error {}

/**
 * PayPal's own button (JS SDK v6) plus the status line under it. Shared by the
 * Donate dialog and the verification fee; both keep their amounts and payees
 * on the server and only pass these two callbacks.
 */
export function PayPalCheckout({ clientId, disabled = false, createOrder, onApprove }: Props) {
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const sessionRef = useRef<PayPalOneTimePaymentSession | null>(null);
  // The session is created once, but its onApprove must call the latest prop.
  const onApproveRef = useRef(onApprove);
  useEffect(() => {
    onApproveRef.current = onApprove;
  }, [onApprove]);

  useEffect(() => {
    let cancelled = false;
    loadPayPal(clientId)
      .then(async (sdk) => {
        const eligibility = await sdk.findEligibleMethods({ currencyCode: "USD" });
        if (cancelled) return;
        if (!eligibility.isEligible("paypal")) return setState("unavailable");
        sessionRef.current = sdk.createPayPalOneTimePaymentSession({
          async onApprove({ orderId }) {
            setMessage({ tone: "info", text: "Confirming your payment…" });
            const problem = await onApproveRef.current(orderId);
            setMessage(problem ? { tone: "error", text: problem } : null);
          },
          onCancel() {
            setMessage({ tone: "info", text: "Payment cancelled. You weren't charged." });
          },
          onError() {
            // Keep a more specific message we already showed.
            setMessage((current) => (current?.tone === "error" ? current : { tone: "error", text: PAYPAL_PROBLEM }));
          },
        });
        setState("ready");
      })
      .catch(() => !cancelled && setState("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function pay() {
    const session = sessionRef.current;
    if (!session || disabled) return;
    setMessage(null);
    if (usesRedirect()) {
      // The server makes the order with return URLs; /paypal/return captures it when PayPal sends the buyer back.
      setMessage({ tone: "info", text: "Taking you to PayPal…" });
      const result = await createOrder({ redirect: true }).catch(() => ({ error: PAYPAL_PROBLEM }));
      if ("error" in result) return setMessage({ tone: "error", text: result.error });
      if (!result.approveUrl) return setMessage({ tone: "error", text: PAYPAL_PROBLEM });
      window.location.assign(result.approveUrl);
      return;
    }
    // Not awaited before start(): the PayPal window has to open inside this click.
    const order = createOrder({ redirect: false }).then((result) => {
      if ("error" in result) throw new OrderError(result.error);
      return { orderId: result.orderId };
    });
    try {
      await session.start({ presentationMode: "auto" }, order);
    } catch {
      const reason = await order.then(
        () => null,
        (e: unknown) => (e instanceof OrderError ? e.message : null),
      );
      setMessage({ tone: "error", text: reason ?? PAYPAL_PROBLEM });
    }
  }

  return (
    <div className="flex flex-col gap-3">
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
      {state === "loading" && <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading PayPal…</p>}
      {state === "unavailable" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          PayPal isn&apos;t available right now. Please try again later.
        </p>
      )}
      <paypal-button hidden={state !== "ready" || disabled} onClick={pay} className="block w-full"></paypal-button>
    </div>
  );
}
