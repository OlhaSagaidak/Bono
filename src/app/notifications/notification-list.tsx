"use client";

import { useState, useTransition } from "react";
import { NotificationItem } from "@/components/notification-item";
import { markAllNotificationsReadAction } from "@/lib/notifications/actions";
import type { NotificationView } from "@/lib/notifications/describe";

export function NotificationList({ items: initial }: { items: NotificationView[] }) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const anyUnread = items.some((i) => i.unread);

  return (
    <section className="flex flex-col gap-2" aria-label="All notifications">
      {anyUnread && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markAllNotificationsReadAction();
              setItems((all) => all.map((i) => ({ ...i, unread: false })));
              window.dispatchEvent(new Event("bono:badges"));
            })
          }
          className="self-end rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-zinc-800"
        >
          Mark all as read
        </button>
      )}
      <ul className="flex flex-col gap-1 rounded-2xl border border-zinc-200 p-2 dark:border-zinc-800">
        {items.map((item) => (
          <NotificationItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
