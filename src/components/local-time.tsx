"use client";

import { useSyncExternalStore } from "react";

// Times are stored in UTC and shown in the viewer's own timezone. The server
// doesn't know that timezone, so the server render shows UTC (labeled) and
// the browser re-renders it in local time right away.
const noop = () => () => {};
export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

const formats = {
  // "Sat, Oct 25, 10:00 AM"
  full: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  // "Oct 25"
  date: { month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export function LocalTime({ iso, format = "full" }: { iso: string; format?: keyof typeof formats }) {
  const isClient = useIsClient();
  const date = new Date(iso);
  const text = new Intl.DateTimeFormat("en", { ...formats[format], ...(isClient ? {} : { timeZone: "UTC" }) }).format(date);
  return <time dateTime={iso}>{isClient || format === "date" ? text : `${text} UTC`}</time>;
}

/** "Sat, Oct 25, 10:00 AM – 1:00 PM" (or a second date when it ends on another day). */
export function LocalTimeRange({ startIso, endIso }: { startIso: string; endIso: string }) {
  const isClient = useIsClient();
  const start = new Date(startIso);
  const end = new Date(endIso);
  const tz = isClient ? {} : { timeZone: "UTC" };
  const sameDay = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", ...tz }).format(start) === new Intl.DateTimeFormat("en-CA", { dateStyle: "short", ...tz }).format(end);
  const startText = new Intl.DateTimeFormat("en", { ...formats.full, ...tz }).format(start);
  const endText = new Intl.DateTimeFormat("en", { ...(sameDay ? formats.time : formats.full), ...tz }).format(end);
  return (
    <span>
      <time dateTime={startIso}>{startText}</time> – <time dateTime={endIso}>{endText}</time>
      {!isClient && " UTC"}
    </span>
  );
}
