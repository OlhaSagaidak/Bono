"use client";

import { Bell, CalendarDays, Clapperboard, Home, MessageCircle, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { NotificationItem } from "@/components/notification-item";
import { markAllNotificationsReadAction } from "@/lib/notifications/actions";
import type { NotificationView } from "@/lib/notifications/describe";

const ITEMS: { href: string; label: string; Icon: LucideIcon; badge?: "messages" }[] = [
  { href: "/feed", label: "Home", Icon: Home },
  { href: "/reels", label: "Reels", Icon: Clapperboard },
  { href: "/messages", label: "Messages", Icon: MessageCircle, badge: "messages" },
  { href: "/following", label: "Following", Icon: Users },
  { href: "/events", label: "Events", Icon: CalendarDays },
];

const itemClass =
  "relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 aria-[current=page]:text-emerald-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:aria-[current=page]:text-emerald-300 lg:px-3";

// Visual only: the link's own aria-label already says how many are unread.
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-semibold leading-4 text-white lg:right-1.5"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

const POLL_MS = 15_000;

/**
 * Unread counts, starting from the server's and refreshed by polling
 * /api/badges while the tab is visible, after each navigation, and whenever
 * something on the page fires "bono:badges" (e.g. after marking read).
 */
function useBadges(initial: { notifications: number; messages: number }) {
  const [counts, setCounts] = useState(initial);
  const pathname = usePathname();
  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/badges", { cache: "no-store" });
      if (res.ok) setCounts(await res.json());
    } catch {
      // Offline for a moment: keep the last counts and try again next time.
    }
  }, []);
  useEffect(() => {
    // Right after each navigation (reading a notification may have changed the count), then on a timer.
    const soon = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener("bono:badges", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(soon);
      clearInterval(timer);
      window.removeEventListener("bono:badges", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh, pathname]);
  return counts;
}

/**
 * The signed-in top bar: icon + label on wide screens, icons only (with
 * aria-labels) on phones. The current page is marked with aria-current.
 */
export function TopNav({ unreadMessages = 0, unreadNotifications = 0 }: { unreadMessages?: number; unreadNotifications?: number }) {
  const pathname = usePathname();
  const counts = useBadges({ notifications: unreadNotifications, messages: unreadMessages });
  return (
    <ul className="flex items-center gap-0.5 lg:gap-1">
      {ITEMS.map(({ href, label, Icon, badge }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        const count = badge === "messages" ? counts.messages : 0;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              aria-label={count > 0 ? `${label}, ${count} unread` : label}
              className={itemClass}
            >
              <Icon aria-hidden className="size-5" />
              <span className="hidden lg:inline">{label}</span>
              <Badge count={count} />
            </Link>
          </li>
        );
      })}
      <li>
        <NotificationsBell unread={counts.notifications} />
      </li>
    </ul>
  );
}

type Recent = { state: "loading" } | { state: "error" } | { state: "ready"; items: NotificationView[] };

/** The bell and its dropdown of the latest notifications, loaded each time it opens. */
function NotificationsBell({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const isOpen = open && openedAt === pathname;
  const [recent, setRecent] = useState<Recent>({ state: "loading" });

  async function load() {
    setRecent({ state: "loading" });
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setRecent({ state: "ready", items: (await res.json()).items });
    } catch {
      setRecent({ state: "error" });
    }
  }

  async function markAllRead() {
    if (recent.state === "ready") setRecent({ state: "ready", items: recent.items.map((i) => ({ ...i, unread: false })) });
    // If this doesn't reach the server, the next badge poll shows the real count again.
    await markAllNotificationsReadAction().catch(() => {});
    window.dispatchEvent(new Event("bono:badges"));
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => {
          if (!isOpen) void load();
          setOpen(!isOpen);
          setOpenedAt(pathname);
        }}
        className={itemClass}
      >
        <Bell aria-hidden className="size-5" />
        <span className="hidden lg:inline">Notifications</span>
        <Badge count={unread} />
      </button>
      {isOpen && (
        <div
          id={panelId}
          className="absolute right-0 z-20 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <p className="text-sm font-semibold">Notifications</p>
            {recent.state === "ready" && recent.items.some((i) => i.unread) && (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:text-emerald-400 dark:hover:bg-zinc-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          {recent.state === "loading" && (
            <p className="px-2 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
          )}
          {recent.state === "error" && (
            <p role="alert" className="px-2 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Couldn&apos;t load notifications.{" "}
              <button type="button" onClick={load} className="font-medium text-emerald-700 underline dark:text-emerald-400">
                Try again
              </button>
            </p>
          )}
          {recent.state === "ready" &&
            (recent.items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400">No notifications yet.</p>
            ) : (
              <ul className="flex max-h-[min(28rem,70vh)] flex-col gap-0.5 overflow-y-auto">
                {recent.items.map((item) => (
                  <NotificationItem key={item.id} item={item} onOpen={() => setOpen(false)} />
                ))}
              </ul>
            ))}
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-2 text-center text-sm font-medium text-emerald-700 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:text-emerald-400 dark:hover:bg-zinc-800"
          >
            See all
          </Link>
        </div>
      )}
    </div>
  );
}
