"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { signOutAction } from "@/lib/auth/actions";

const item =
  "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 focus:outline-2 focus:outline-offset-[-2px] focus:outline-emerald-600 dark:hover:bg-zinc-800";

/**
 * The less-used account links behind one button, so the header fits on a
 * phone. Closes on Escape, on a click outside, and on navigation.
 */
export function AccountMenu({ name, links }: { name: string; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Navigating elsewhere closes the menu (derived, rather than an effect).
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
        aria-controls={menuId}
        onClick={() => {
          setOpen(!isOpen);
          setOpenedAt(pathname);
        }}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:hover:bg-zinc-800"
      >
        Account
        <svg aria-hidden viewBox="0 0 20 20" className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="currentColor">
          <path fillRule="evenodd" d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <div
          id={menuId}
          className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="truncate px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">Signed in as {name}</p>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={item} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <form action={signOutAction}>
            <button type="submit" className={item}>
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
