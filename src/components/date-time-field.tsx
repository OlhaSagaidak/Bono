"use client";

import { useState } from "react";
import { useIsClient } from "@/components/local-time";

/** "2026-10-25T10:00" in the browser's timezone, for <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The organizer picks a date and time in their own timezone; the form sends
 * it as a UTC ISO string in a hidden field with the same name. Rendered only
 * in the browser, since only the browser knows the timezone.
 */
export function DateTimeField({ name, label, defaultIso, errors }: { name: string; label: string; defaultIso?: string; errors?: string[] }) {
  const isClient = useIsClient();
  const [iso, setIso] = useState(defaultIso ?? "");
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${name}-local`} className="text-sm font-medium">
        {label}
      </label>
      {isClient ? (
        <input
          id={`${name}-local`}
          type="datetime-local"
          defaultValue={toLocalInput(iso)}
          onChange={(e) => setIso(e.target.value ? new Date(e.target.value).toISOString() : "")}
          aria-invalid={errors ? true : undefined}
          aria-describedby={errors ? errorId : undefined}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      ) : (
        <div className="h-10 rounded-lg border border-zinc-300 dark:border-zinc-700" aria-hidden />
      )}
      <input type="hidden" name={name} value={iso} />
      {errors && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
