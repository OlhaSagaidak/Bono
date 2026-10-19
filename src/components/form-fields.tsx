"use client";

// Shared form pieces so every input has a visible label and announces its errors.

import { useState } from "react";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function describedBy(name: string, hint?: string, errors?: string[]) {
  const ids = [hint && `${name}-hint`, errors && `${name}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function Hint({ name, hint }: { name: string; hint?: string }) {
  if (!hint) return null;
  return (
    <p id={`${name}-hint`} className="text-sm text-zinc-600 dark:text-zinc-400">
      {hint}
    </p>
  );
}

function FieldError({ name, errors }: { name: string; errors?: string[] }) {
  if (!errors) return null;
  return (
    <p id={`${name}-error`} className="text-sm text-red-700 dark:text-red-400">
      {errors[0]}
    </p>
  );
}

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
  defaultValue?: string;
  required?: boolean;
};

export function TextField({
  type = "text",
  autoComplete,
  required = true,
  readOnly = false,
  inputMode,
  ...p
}: FieldProps & {
  type?: string;
  autoComplete?: string;
  readOnly?: boolean;
  /** e.g. "decimal" so phones show a number keyboard for amounts. */
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={p.name} className="text-sm font-medium">
        {p.label}
      </label>
      <Hint name={p.name} hint={p.hint} />
      <input
        id={p.name}
        name={p.name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        readOnly={readOnly}
        inputMode={inputMode}
        defaultValue={p.defaultValue}
        aria-invalid={p.errors ? true : undefined}
        aria-describedby={describedBy(p.name, p.hint, p.errors)}
        className={`${inputClass} read-only:bg-zinc-100 read-only:text-zinc-600 dark:read-only:bg-zinc-800 dark:read-only:text-zinc-400`}
      />
      <FieldError name={p.name} errors={p.errors} />
    </div>
  );
}

export function TextArea({
  maxLength,
  required = true,
  rows = 4,
  ...p
}: FieldProps & { maxLength: number; rows?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={p.name} className="text-sm font-medium">
        {p.label}
      </label>
      <Hint name={p.name} hint={p.hint} />
      <textarea
        id={p.name}
        name={p.name}
        rows={rows}
        maxLength={maxLength}
        required={required}
        defaultValue={p.defaultValue}
        aria-invalid={p.errors ? true : undefined}
        aria-describedby={describedBy(p.name, p.hint, p.errors)}
        className={inputClass}
      />
      <FieldError name={p.name} errors={p.errors} />
    </div>
  );
}

export function SelectField({ options, ...p }: FieldProps & { options: readonly { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={p.name} className="text-sm font-medium">
        {p.label}
      </label>
      <Hint name={p.name} hint={p.hint} />
      <select
        id={p.name}
        name={p.name}
        defaultValue={p.defaultValue}
        aria-invalid={p.errors ? true : undefined}
        aria-describedby={describedBy(p.name, p.hint, p.errors)}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError name={p.name} errors={p.errors} />
    </div>
  );
}

/** Checkboxes styled as chips. Submits every checked value under the same name. */
export function ChipGroup({
  name,
  legend,
  hint,
  options,
  defaultChecked,
  errors,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: { value: string; label: string }[];
  defaultChecked: string[];
  errors?: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={describedBy(name, hint, errors)}>
      <legend className="text-sm font-medium">{legend}</legend>
      <Hint name={name} hint={hint} />
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-700 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-600 dark:border-zinc-700"
          >
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={defaultChecked.includes(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      <FieldError name={name} errors={errors} />
    </fieldset>
  );
}

// Must match MAX_IMAGE_BYTES in lib/images.ts (the server checks again).
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function ImageField({
  name,
  label,
  hint,
  accept,
  currentUrl,
  errors,
}: {
  name: string;
  label: string;
  hint?: string;
  accept: string;
  currentUrl?: string;
  errors?: string[];
}) {
  // Checked as soon as a file is picked: a file over the upload limit would
  // otherwise be rejected before the server's own friendly check could run.
  const [localError, setLocalError] = useState<string>();
  const shown = localError ? [localError] : errors;

  function check(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLocalError(undefined);
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError("That image is over 2 MB. Choose a smaller one.");
      e.target.value = "";
    } else if (!accept.split(",").includes(file.type)) {
      setLocalError("Use a PNG, JPEG or WebP image.");
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Hint name={name} hint={hint} />
      <div className="flex items-center gap-3">
        {currentUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own API, no optimization needed
          <img src={currentUrl} alt="Current logo" className="size-14 rounded-full object-cover" />
        )}
        <input
          id={name}
          name={name}
          type="file"
          accept={accept}
          onChange={check}
          aria-invalid={shown ? true : undefined}
          aria-describedby={describedBy(name, hint, shown)}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:font-medium dark:file:bg-zinc-800 dark:file:text-zinc-100"
        />
      </div>
      <FieldError name={name} errors={shown} />
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
