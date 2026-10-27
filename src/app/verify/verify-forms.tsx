"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { FormError, SubmitButton, TextField } from "@/components/form-fields";
import { PayPalCheckout } from "@/components/paypal-checkout";
import { textValue, type FormState } from "@/lib/forms";
import { captureVerificationFeeAction, checkEinAction, createVerificationFeeOrderAction } from "@/lib/verification/actions";

export function EinForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(checkEinAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <TextField
        name="ein"
        label="Employer Identification Number (EIN)"
        hint="The 9-digit number the IRS assigned your organization, like 12-3456789."
        autoComplete="off"
        defaultValue={textValue(state, "ein")}
        errors={state.fieldErrors?.ein}
      />
      <SubmitButton pending={pending}>Check EIN</SubmitButton>
    </form>
  );
}

export function FeeCheckout({ clientId }: { clientId: string }) {
  const router = useRouter();
  return (
    <PayPalCheckout
      clientId={clientId}
      createOrder={({ redirect }) => createVerificationFeeOrderAction({ redirect })}
      onApprove={async (orderId) => {
        const result = await captureVerificationFeeAction(orderId);
        if ("declined" in result) return "Your payment method was declined. Try another one.";
        if ("error" in result) return result.error;
        // Verified, or paid from a different account: the page shows which.
        router.refresh();
        return null;
      }}
    />
  );
}
