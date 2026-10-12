"use client";

import { useActionState } from "react";
import {
  ChipGroup,
  FormError,
  ImageField,
  SubmitButton,
  TextArea,
  TextField,
} from "@/components/form-fields";
import { listValue, textValue, type FormState } from "@/lib/forms";
import {
  saveInterestsAction,
  saveNonprofitProfileAction,
  saveSponsorProfileAction,
} from "@/lib/profiles/actions";
import { ABOUT_MAX, MISSION_MAX } from "@/lib/profiles/validation";

type Option = { value: string; label: string };
const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const formClass = "flex flex-col gap-5";

export function InterestsForm({ causes, selected }: { causes: Option[]; selected: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveInterestsAction, {});
  return (
    <form action={action} className={formClass} noValidate>
      <FormError message={state.error} />
      <ChipGroup
        name="causes"
        legend="Causes"
        hint="Pick as many as you like."
        options={causes}
        defaultChecked={listValue(state, "causes") ?? selected}
        errors={state.fieldErrors?.causes}
      />
      <SubmitButton pending={pending}>Save and see my feed</SubmitButton>
    </form>
  );
}

export function NonprofitProfileForm({
  causes,
  initial,
}: {
  causes: Option[];
  initial: {
    name: string;
    mission: string;
    paypalPayeeEmail: string;
    causes: string[];
    logoUrl?: string;
    verified: boolean;
  };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveNonprofitProfileAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className={formClass} noValidate>
      <FormError message={state.error} />
      <TextField
        name="name"
        label="Organization name"
        autoComplete="organization"
        defaultValue={textValue(state, "name") ?? initial.name}
        errors={errors.name}
      />
      <TextArea
        name="mission"
        label="Mission"
        hint={`One or two sentences, up to ${MISSION_MAX} characters.`}
        maxLength={MISSION_MAX}
        defaultValue={textValue(state, "mission") ?? initial.mission}
        errors={errors.mission}
      />
      <ChipGroup
        name="causes"
        legend="Causes"
        hint="Pick up to 3. Your posts reach supporters who care about these."
        options={causes}
        defaultChecked={listValue(state, "causes") ?? initial.causes}
        errors={errors.causes}
      />
      <ImageField
        name="logo"
        label="Logo (optional)"
        hint="PNG, JPEG or WebP, up to 2 MB. Square works best."
        accept={IMAGE_ACCEPT}
        currentUrl={initial.logoUrl}
        errors={errors.logo}
      />
      <TextField
        name="paypalPayeeEmail"
        label="PayPal email for donations"
        hint={
          initial.verified
            ? "Locked after verification, because donations go straight to this account. Contact Bono to change it."
            : "The email of your PayPal Business account (a sandbox account for this demo). Donations go straight to it; Bono never holds them. You'll pay the verification fee from this account."
        }
        readOnly={initial.verified}
        type="email"
        autoComplete="email"
        defaultValue={textValue(state, "paypalPayeeEmail") ?? initial.paypalPayeeEmail}
        errors={errors.paypalPayeeEmail}
      />
      <SubmitButton pending={pending}>Save profile</SubmitButton>
    </form>
  );
}

export function SponsorProfileForm({
  initial,
}: {
  initial: { name: string; about: string; logoUrl?: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSponsorProfileAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className={formClass} noValidate>
      <FormError message={state.error} />
      <TextField
        name="name"
        label="Company name"
        autoComplete="organization"
        defaultValue={textValue(state, "name") ?? initial.name}
        errors={errors.name}
      />
      <TextArea
        name="about"
        label="About (optional)"
        hint={`Up to ${ABOUT_MAX} characters.`}
        maxLength={ABOUT_MAX}
        required={false}
        defaultValue={textValue(state, "about") ?? initial.about}
        errors={errors.about}
      />
      <ImageField
        name="logo"
        label="Logo (optional)"
        hint="PNG, JPEG or WebP, up to 2 MB. Square works best."
        accept={IMAGE_ACCEPT}
        currentUrl={initial.logoUrl}
        errors={errors.logo}
      />
      <SubmitButton pending={pending}>Save profile</SubmitButton>
    </form>
  );
}
