// Browser-only: loads PayPal's JS SDK v6 once per page and creates one SDK instance.
// Only the public client ID is used here; every order is created and captured
// on the server.

const SCRIPT_SRC = "https://www.sandbox.paypal.com/web-sdk/v6/core";

let instance: Promise<PayPalSdkInstance> | null = null;

export function loadPayPal(clientId: string): Promise<PayPalSdkInstance> {
  instance ??= loadScript()
    .then((paypal) => paypal.createInstance({ clientId, components: ["paypal-payments"] }))
    .catch((error: unknown) => {
      instance = null; // let the next attempt retry, e.g. after a flaky network
      throw error;
    });
  return instance;
}

function loadScript(): Promise<NonNullable<Window["paypal"]>> {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK loaded without window.paypal")));
    script.onerror = () => {
      script.remove();
      reject(new Error("Couldn't load the PayPal SDK"));
    };
    document.head.appendChild(script);
  });
}
