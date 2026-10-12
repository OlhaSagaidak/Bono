// Shared form pieces so every input has a visible label and announces its errors.

export function TextField({
  name,
  label,
  type = "text",
  autoComplete,
  errors,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  errors?: string[];
}) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      {errors && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
          {errors[0]}
        </p>
      )}
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
