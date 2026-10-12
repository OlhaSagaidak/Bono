"use client";

import { useActionState } from "react";
import { FormError, SubmitButton, TextField } from "@/components/form-fields";
import { signUpAction } from "@/lib/auth/actions";
import { textValue, type FormState } from "@/lib/forms";

const ROLES = [
  { value: "user", label: "Supporter", hint: "Discover causes, follow and donate." },
  { value: "nonprofit", label: "Nonprofit", hint: "Get verified, post updates, receive donations." },
  { value: "sponsor", label: "Sponsor", hint: "Fund matching campaigns and boost posts." },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, {});
  const roleErrors = state.fieldErrors?.role;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={roleErrors ? "role-error" : undefined}
      >
        <legend className="mb-1 text-sm font-medium">I’m joining as a…</legend>
        {ROLES.map((r) => (
          <label
            key={r.value}
            className="flex cursor-pointer gap-3 rounded-lg border border-zinc-300 p-3 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 dark:border-zinc-700 dark:has-[:checked]:bg-emerald-950"
          >
            <input type="radio" name="role" value={r.value} defaultChecked={(textValue(state, "role") ?? "user") === r.value} className="mt-1 accent-emerald-700" />
            <span>
              <span className="block font-medium">{r.label}</span>
              <span className="block text-sm text-zinc-600 dark:text-zinc-400">{r.hint}</span>
            </span>
          </label>
        ))}
        {roleErrors && (
          <p id="role-error" className="text-sm text-red-700 dark:text-red-400">{roleErrors[0]}</p>
        )}
      </fieldset>

      <TextField name="name" label="Name" autoComplete="name" defaultValue={textValue(state, "name")} errors={state.fieldErrors?.name} />
      <TextField name="email" label="Email" type="email" autoComplete="email" defaultValue={textValue(state, "email")} errors={state.fieldErrors?.email} />
      <TextField
        name="password"
        label="Password (at least 8 characters)"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
      />

      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}
