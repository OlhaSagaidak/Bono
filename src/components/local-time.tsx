"use client";

import { useSyncExternalStore } from "react";

// Times are stored in UTC and shown in the viewer's own timezone. The server
// doesn't know that timezone, so the server render shows UTC (labeled) and
// the browser re-renders it in local time right away.
//
// That first UTC text is built by hand, not with Intl: browsers format dates
// slightly differently from Node (Safari, for one, uses another space before
// "AM"), and the browser's first render must match the server's exactly.
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The same shapes as `formats`, in UTC, without Intl. */
function utcText(d: Date, format: keyof typeof formats): string {
  const h = d.getUTCHours();
  const time = `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  const date = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (format === "date") return date;
  if (format === "time") return time;
  return `${WEEKDAYS[d.getUTCDay()]}, ${date}, ${time}`;
}

const local = (d: Date, format: keyof typeof formats) => new Intl.DateTimeFormat("en", formats[format]).format(d);

export function LocalTime({ iso, format = "full" }: { iso: string; format?: keyof typeof formats }) {
  const isClient = useIsClient();
  const date = new Date(iso);
  if (isClient) return <time dateTime={iso}>{local(date, format)}</time>;
  return <time dateTime={iso}>{format === "date" ? utcText(date, format) : `${utcText(date, format)} UTC`}</time>;
}

/** "Sat, Oct 25, 10:00 AM – 1:00 PM" (or a second date when it ends on another day). */
export function LocalTimeRange({ startIso, endIso }: { startIso: string; endIso: string }) {
  const isClient = useIsClient();
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = isClient
    ? start.toDateString() === end.toDateString()
    : start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  const show = isClient ? local : utcText;
  return (
    <span>
      <time dateTime={startIso}>{show(start, "full")}</time> – <time dateTime={endIso}>{show(end, sameDay ? "time" : "full")}</time>
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
  let text = now ? local(date, "date") : utcText(date, "date");
  if (now) {
    const minutes = Math.round((now - date.getTime()) / 60_000);
    if (minutes < 1) text = "just now";
    else if (minutes < 60) text = relative.format(-minutes, "minute");
    else if (minutes < 24 * 60) text = relative.format(-Math.round(minutes / 60), "hour");
    else if (minutes < 7 * 24 * 60) text = relative.format(-Math.round(minutes / 1440), "day");
  }
  return <time dateTime={iso}>{text}</time>;
}
