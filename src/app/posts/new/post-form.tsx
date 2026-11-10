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
import { ALT_MAX, BODY_MAX, COVER_TEXT_MAX, LANGUAGES } from "@/lib/posts/validation";

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
      <SubmitButton pending={pending}>Publish</SubmitButton>
    </form>
  );
}
