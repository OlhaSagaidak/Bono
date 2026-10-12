// The slice of PayPal's JS SDK v6 (https://www.sandbox.paypal.com/web-sdk/v6/core)
// that Bono uses, typed from PayPal's v6 one-time payment docs. PayPal ships no
// types package for v6, so this is ours; extend it only from the docs.

type PayPalOneTimePaymentCallbacks = {
  onApprove: (data: { orderId: string }) => Promise<void> | void;
  onCancel?: (data?: { orderId?: string }) => void;
  onError?: (error: Error) => void;
};

type PayPalOneTimePaymentSession = {
  // The order promise is passed un-awaited so the popup opens within the click.
  start: (
    options: { presentationMode: "auto" | "popup" | "modal" | "redirect" },
    createOrder: Promise<{ orderId: string }>,
  ) => Promise<void>;
};

type PayPalSdkInstance = {
  findEligibleMethods: (options?: { currencyCode?: string }) => Promise<{ isEligible: (method: "paypal") => boolean }>;
  createPayPalOneTimePaymentSession: (callbacks: PayPalOneTimePaymentCallbacks) => PayPalOneTimePaymentSession;
};

interface Window {
  paypal?: {
    createInstance: (options: { clientId: string; components: "paypal-payments"[] }) => Promise<PayPalSdkInstance>;
  };
}

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      // PayPal's branded button web component, defined once the SDK script loads.
      "paypal-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
