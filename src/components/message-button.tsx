import { MessageCircle } from "lucide-react";
import { startConversationAction } from "@/lib/messages/actions";

/** "Message" on a profile: opens (or starts) the conversation with that person. */
export function MessageButton({ userId, size = "small" }: { userId: string; size?: "small" | "large" }) {
  return (
    <form action={startConversationAction.bind(null, userId)}>
      <button
        type="submit"
        className={`flex items-center gap-1.5 rounded-lg border border-zinc-300 font-medium hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800 ${
          size === "large" ? "px-4 py-2.5" : "px-3 py-1.5 text-sm"
        }`}
      >
        <MessageCircle aria-hidden className="size-4" />
        Message
      </button>
    </form>
  );
}
