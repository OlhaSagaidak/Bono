import type { Reaction } from "@/db/schema";

// The reaction choices, in picker order. Shared by the server and the UI.
export const REACTIONS: { key: Reaction; emoji: string; label: string }[] = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "care", emoji: "🤗", label: "Care" },
  { key: "haha", emoji: "😂", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "sad", emoji: "😢", label: "Sad" },
];

export const COMMENT_MAX = 1000;
