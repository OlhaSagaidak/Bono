"use client";

import { useActionState } from "react";
import {
  ChipGroup,
  FormError,
  ImageField,
  SelectField,
  SubmitButton,
  TextArea,
  TextField,
} from "@/components/form-fields";
import { listValue, textValue, type FormState } from "@/lib/forms";
import { createPostAction } from "@/lib/posts/actions";
import { COVER_TEXT_POSITIONS } from "@/components/cover-text";
import { ALT_MAX, BODY_MAX, COVER_TEXT_MAX, GOAL_TITLE_MAX, LANGUAGES } from "@/lib/posts/validation";

export function PostForm({ causes }: { causes: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPostAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      <TextArea
        name="body"
        label="Post"
        hint={`Up to ${BODY_MAX} characters.`}
        maxLength={BODY_MAX}
        rows={6}
        defaultValue={textValue(state, "body")}
        errors={errors.body}
      />
      <SelectField
        name="language"
        label="Written in"
        hint="Supporters who read another language get a Translate button."
        options={LANGUAGES}
        defaultValue={textValue(state, "language") ?? "en"}
        errors={errors.language}
      />
      <ChipGroup
        name="causes"
        legend="Causes"
        hint="Helps the feed show this post to people who care about it."
        options={causes}
        // A single-cause nonprofit has nothing to choose, so start with all of them ticked.
        defaultChecked={listValue(state, "causes") ?? causes.map((c) => c.value)}
        errors={errors.causes}
      />
      <ImageField
        name="image"
        label="Image (optional)"
        hint="PNG, JPEG or WebP, up to 2 MB."
        accept="image/png,image/jpeg,image/webp"
        errors={errors.image}
      />
      <TextField
        name="imageAlt"
        label="Image description"
        hint={`Required with an image. Describe it for people using screen readers (up to ${ALT_MAX} characters).`}
        required={false}
        defaultValue={textValue(state, "imageAlt")}
        errors={errors.imageAlt}
      />
      <TextField
        name="coverText"
        label="Text on the photo (optional)"
        hint={`A line or two shown over the photo, like "42 kittens are waiting for a foster home this winter". Up to ${COVER_TEXT_MAX} characters.`}
        required={false}
        defaultValue={textValue(state, "coverText")}
        errors={errors.coverText}
      />
      <SelectField
        name="coverTextPosition"
        label="Where the text goes"
        hint="Pick the spot that covers the least of what matters in the photo."
        options={COVER_TEXT_POSITIONS}
        defaultValue={textValue(state, "coverTextPosition") || "middle"}
      />
      <fieldset className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Fundraising goal (optional)</legend>
        <p className="-mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Give the post a goal and supporters see a progress bar that moves with every gift, sponsor matches included.
        </p>
        <TextField
          name="goalTitle"
          label="What it's for"
          hint={`Short and concrete, like "Rex's surgery" or "Winter coats for 40 kids". Up to ${GOAL_TITLE_MAX} characters.`}
          required={false}
          defaultValue={textValue(state, "goalTitle")}
          errors={errors.goalTitle}
        />
        <TextField
          name="goalDollars"
          label="Amount (USD)"
          hint="Whole dollars, like 2400."
          required={false}
          defaultValue={textValue(state, "goalDollars")}
          errors={errors.goalDollars}
        />
      </fieldset>
      <SubmitButton pending={pending}>Publish</SubmitButton>
    </form>
  );
}
