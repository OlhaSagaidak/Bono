import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { TimeAgo } from "@/components/local-time";
import type { InboxItem } from "@/lib/messages/queries";

/** Conversations, newest first: photo, name, last message, time and an unread dot. */
export function InboxList({ items, selectedId, compact = false }: { items: InboxItem[]; selectedId?: string; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/messages/${c.id}`}
            aria-current={c.id === selectedId ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg ${compact ? "p-1.5" : "p-2"} hover:bg-zinc-100 focus:outline-2 focus:outline-emerald-600 aria-[current=page]:bg-emerald-50 dark:hover:bg-zinc-800 dark:aria-[current=page]:bg-emerald-950/60`}
          >
            <Avatar name={c.other.name} imageId={c.other.photoImageId} className={compact ? "size-8 text-sm" : "size-11"} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-baseline justify-between gap-2">
                <span className={`truncate text-sm ${c.unread ? "font-bold" : "font-medium"}`}>{c.other.name}</span>
                {!compact && c.lastMessageAt && (
                  <span className="shrink-0 text-xs text-zinc-600 dark:text-zinc-400">
                    <TimeAgo iso={c.lastMessageAt.toISOString()} />
                  </span>
                )}
              </span>
              <span className={`truncate text-sm ${c.unread ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                {c.lastFromMe && "You: "}
                {c.lastBody}
              </span>
            </span>
            {c.unread && (
              <>
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-emerald-600" />
                <span className="sr-only">(unread)</span>
              </>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
