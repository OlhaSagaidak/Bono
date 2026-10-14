"use client";

import { useActionState, useState } from "react";
import { ChipGroup, FormError, SelectField, SubmitButton, TextField } from "@/components/form-fields";
import { listValue, textValue, type FormState } from "@/lib/forms";
import { createCampaignAction } from "@/lib/matching/actions";
import { RATIOS } from "@/lib/matching/validation";

type Option = { value: string; label: string };

export function CampaignForm({ causes, nonprofits, today, inAMonth }: { causes: Option[]; nonprofits: Option[]; today: string; inAMonth: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCampaignAction, {});
  const [target, setTarget] = useState(textValue(state, "target") ?? "cause");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      <TextField name="name" label="Campaign name" hint="Supporters see it on the posts you match, e.g. “Acme Animal Rescue Match”." defaultValue={textValue(state, "name")} errors={errors.name} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">What should it match?</legend>
        {[
          { value: "cause", label: "Every verified nonprofit in a cause" },
          { value: "nonprofits", label: "Specific nonprofits" },
        ].map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <input type="radio" name="target" value={o.value} checked={target === o.value} onChange={() => setTarget(o.value)} className="accent-emerald-700" />
            {o.label}
          </label>
        ))}
      </fieldset>
      {target === "cause" ? (
        <SelectField name="causeSlug" label="Cause" options={[{ value: "", label: "Choose a cause" }, ...causes]} defaultValue={textValue(state, "causeSlug") ?? ""} errors={errors.causeSlug} />
      ) : (
        <ChipGroup name="nonprofitIds" legend="Nonprofits" options={nonprofits} defaultChecked={listValue(state, "nonprofitIds") ?? []} errors={errors.nonprofitIds} />
      )}

      <SelectField name="ratioPercent" label="Match ratio" options={RATIOS} defaultValue={textValue(state, "ratioPercent") ?? "100"} errors={errors.ratioPercent} />
      <TextField name="cap" label="Most you'll match for one donation ($)" type="text" defaultValue={textValue(state, "cap") ?? "100"} errors={errors.cap} />
      <TextField name="pool" label="Matching pool ($)" hint="You pay this once, through PayPal, to fund the campaign. $10 minimum." type="text" defaultValue={textValue(state, "pool") ?? "500"} errors={errors.pool} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="startsAt" label="Starts" type="date" defaultValue={textValue(state, "startsAt") ?? today} errors={errors.startsAt} />
        <TextField name="endsAt" label="Ends" type="date" defaultValue={textValue(state, "endsAt") ?? inAMonth} errors={errors.endsAt} />
      </div>
      <SubmitButton pending={pending}>Create campaign</SubmitButton>
    </form>
  );
}
