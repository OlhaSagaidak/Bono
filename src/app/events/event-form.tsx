"use client";

import { useActionState, useState } from "react";
import { DateTimeField } from "@/components/date-time-field";
import { ChipGroup, CountedTextArea, FormError, ImageField, SubmitButton, TextField } from "@/components/form-fields";
import { saveEventAction } from "@/lib/events/actions";
import { DESCRIPTION_MAX } from "@/lib/events/validation";
import { listValue, textValue, type FormState } from "@/lib/forms";

type Initial = {
  id?: string;
  title: string;
  description: string;
  startsAt?: string;
  endsAt?: string;
  locationType: "in_person" | "online";
  address: string;
  onlineUrl: string;
  capacity: string;
  causes: string[];
  coverUrl?: string;
};

export function EventForm({ initial, causes }: { initial: Initial; causes: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveEventAction, {});
  const errors = state.fieldErrors ?? {};
  const [location, setLocation] = useState(textValue(state, "locationType") ?? initial.locationType);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {initial.id && <input type="hidden" name="eventId" value={initial.id} />}
      <FormError message={state.error} />
      <TextField name="title" label="Title" defaultValue={textValue(state, "title") ?? initial.title} errors={errors.title} />
      <CountedTextArea name="description" label="Description" maxLength={DESCRIPTION_MAX} defaultValue={textValue(state, "description") ?? initial.description} errors={errors.description} />
      <div className="grid gap-5 sm:grid-cols-2">
        <DateTimeField name="startsAt" label="Starts" defaultIso={textValue(state, "startsAt") ?? initial.startsAt} errors={errors.startsAt} />
        <DateTimeField name="endsAt" label="Ends" defaultIso={textValue(state, "endsAt") ?? initial.endsAt} errors={errors.endsAt} />
      </div>
      <p className="-mt-3 text-sm text-zinc-600 dark:text-zinc-400">In your own timezone; everyone else sees it in theirs.</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Where</legend>
        {[
          { value: "in_person", label: "In person" },
          { value: "online", label: "Online" },
        ].map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <input type="radio" name="locationType" value={o.value} checked={location === o.value} onChange={() => setLocation(o.value as Initial["locationType"])} className="accent-emerald-700" />
            {o.label}
          </label>
        ))}
      </fieldset>
      {location === "in_person" ? (
        <TextField name="address" label="Address" autoComplete="street-address" defaultValue={textValue(state, "address") ?? initial.address} errors={errors.address} />
      ) : (
        <TextField name="onlineUrl" label="Link to join" type="url" hint="Shown to everyone who opens the event." defaultValue={textValue(state, "onlineUrl") ?? initial.onlineUrl} errors={errors.onlineUrl} />
      )}
      <TextField name="capacity" label="Capacity (optional)" hint="The most people who can mark Going. Leave empty for no limit." inputMode="numeric" required={false} defaultValue={textValue(state, "capacity") ?? initial.capacity} errors={errors.capacity} />
      <ChipGroup name="causes" legend="Causes" options={causes} defaultChecked={listValue(state, "causes") ?? initial.causes} errors={errors.causes} />
      <ImageField name="cover" label="Cover image (optional)" hint="PNG, JPEG or WebP, up to 2 MB." accept="image/png,image/jpeg,image/webp" currentUrl={initial.coverUrl} errors={errors.cover} removeName="removeCover" round={false} />
      <SubmitButton pending={pending}>{initial.id ? "Save changes" : "Create event"}</SubmitButton>
    </form>
  );
}
