"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { LocalTime, TimeAgo } from "@/components/local-time";
import { markNotificationReadAction } from "@/lib/notifications/actions";
import type { NotificationView } from "@/lib/notifications/describe";

/** One notification: unread ones are tinted and say so to screen readers. Opening one marks it read. */
export function NotificationItem({ item, onOpen }: { item: NotificationView; onOpen?: () => void }) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={() => {
          if (item.unread) void markNotificationReadAction(item.id).then(() => window.dispatchEvent(new Event("bono:badges")));
          onOpen?.();
        }}
        className={`flex gap-3 rounded-lg px-2 py-2 text-sm hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 dark:hover:bg-zinc-800 ${
          item.unread ? "bg-emerald-50 dark:bg-emerald-950/60" : ""
        }`}
      >
        <Avatar name={item.actor?.name ?? "Bono"} imageId={item.actor?.photoImageId ?? null} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span>
            {item.unread && <span className="sr-only">Unread: </span>}
            {item.lead && <strong className="font-semibold">{item.lead} </strong>}
            {item.text}
            {item.startsAt && (
              <>
                {" "}
                <span className="text-zinc-700 dark:text-zinc-300">
                  <LocalTime iso={item.startsAt} />
                </span>
              </>
            )}
          </span>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            <TimeAgo iso={item.createdAt} />
          </span>
        </span>
        {item.unread && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-600" />}
      </Link>
    </li>
  );
}
