"use client";

import { useActionState } from "react";
import { FormError, SubmitButton, TextField } from "@/components/form-fields";
import { signInAction, type FormState } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, {});

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <TextField name="email" label="Email" type="email" autoComplete="email" errors={state.fieldErrors?.email} />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />
      <SubmitButton pending={pending}>Log in</SubmitButton>
    </form>
  );
}
