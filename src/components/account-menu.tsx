"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { signOutAction } from "@/lib/auth/actions";

const item =
  "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 focus:outline-2 focus:outline-offset-[-2px] focus:outline-emerald-600 dark:hover:bg-zinc-800";

/**
 * The less-used account links behind one button, so the header fits on a
 * phone. Closes on Escape, on a click outside, and on navigation.
 */
export function AccountMenu({
  name,
  photoImageId = null,
  links,
}: {
  name: string;
  /** Your profile photo (or logo); the first letter of your name without one. */
  photoImageId?: string | null;
  links: { href: string; label: string }[];
}) {
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
        aria-label="Account"
        className="relative ml-1 rounded-full focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
      >
        <Avatar name={name || "?"} imageId={photoImageId} className="size-10 text-base hover:brightness-95" />
        {/* The little chevron badge says "this opens a menu". */}
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-white bg-zinc-200 text-zinc-800 dark:border-zinc-950 dark:bg-zinc-700 dark:text-zinc-100"
        >
          <ChevronDown className={`size-3 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={3} />
        </span>
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
