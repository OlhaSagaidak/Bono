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

// A shared clock for "5 min ago": the snapshot is the current minute, so it
// stays stable between renders, and one timer tells every TimeAgo to re-check.
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | undefined;
function subscribeClock(listener: () => void) {
  if (clockListeners.size === 0) clockTimer = setInterval(() => clockListeners.forEach((l) => l()), 15_000);
  clockListeners.add(listener);
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) clearInterval(clockTimer);
  };
}
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

/** "just now", "5 min. ago", "3 days ago", then a date. The server render shows the date. */
export function TimeAgo({ iso }: { iso: string }) {
  const now = useSyncExternalStore(subscribeClock, currentMinute, () => 0);
  const date = new Date(iso);
  const dateText = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", ...(now ? {} : { timeZone: "UTC" }) }).format(date);
  let text = dateText;
  if (now) {
    const minutes = Math.round((now - date.getTime()) / 60_000);
    if (minutes < 1) text = "just now";
    else if (minutes < 60) text = relative.format(-minutes, "minute");
    else if (minutes < 24 * 60) text = relative.format(-Math.round(minutes / 60), "hour");
    else if (minutes < 7 * 24 * 60) text = relative.format(-Math.round(minutes / 1440), "day");
  }
  return <time dateTime={iso}>{text}</time>;
}
