"use client";

import { Bell, CalendarDays, Clapperboard, Home, MessageCircle, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

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

/**
 * The signed-in top bar: icon + label on wide screens, icons only (with
 * aria-labels) on phones. The current page is marked with aria-current.
 */
export function TopNav({ unreadMessages = 0, unreadNotifications = 0 }: { unreadMessages?: number; unreadNotifications?: number }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-0.5 lg:gap-1">
      {ITEMS.map(({ href, label, Icon, badge }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        const count = badge === "messages" ? unreadMessages : 0;
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
        <NotificationsBell unread={unreadNotifications} />
      </li>
    </ul>
  );
}

/** The bell and its dropdown of recent notifications (filled in by the notifications slice). */
function NotificationsBell({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const isOpen = open && openedAt === pathname;

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
          <p className="px-2 py-1 text-sm font-semibold">Notifications</p>
          <p className="px-2 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400">No notifications yet.</p>
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
