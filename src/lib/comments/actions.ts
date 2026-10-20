"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { commentReactions, notifications, postComments, reactionEnum, type Reaction } from "@/db/schema";
import { notify } from "@/lib/notifications/notify";
import { COMMENT_MAX } from "./reactions";
import { getComments, visiblePost, type CommentView } from "./queries";

// Comments, replies and reactions. Every action re-checks who is calling
// and that the post is one they may see.

const uuid = z.uuid();
const NO_POST = "That post doesn't exist.";

export async function addCommentAction(postId: string, body: string, parentId: string | null): Promise<{ comments: CommentView[] } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Log in to comment." };
  if (!uuid.safeParse(postId).success || (parentId !== null && !uuid.safeParse(parentId).success)) return { error: NO_POST };
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return { error: "Write a comment first." };
  if (text.length > COMMENT_MAX) return { error: `Comments can be up to ${COMMENT_MAX} characters.` };
  const userId = session.user.id;
  const post = await visiblePost(postId, userId);
  if (!post) return { error: NO_POST };

  // A reply to a reply joins the same thread, so replies stay one level deep.
  let threadId: string | null = null;
  let parentAuthorId: string | null = null;
  if (parentId) {
    const parent = await db.query.postComments.findFirst({
      where: and(eq(postComments.id, parentId), eq(postComments.postId, postId)),
      columns: { id: true, parentId: true, authorId: true },
    });
    if (!parent) return { error: "That comment was deleted." };
    threadId = parent.parentId ?? parent.id;
    parentAuthorId = parent.authorId;
  }

  const [comment] = await db.insert(postComments).values({ postId, authorId: userId, parentId: threadId, body: text }).returning({ id: postComments.id, at: postComments.createdAt });

  // The nonprofit hears about comments on its post (one notification per post,
  // bumped by each new comment); the person replied to hears about the reply.
  await notify([post.nonprofitId], { type: "post_comment", actorId: userId, targetId: postId, key: postId, repeat: "bump", at: comment.at });
  if (parentAuthorId && parentAuthorId !== post.nonprofitId) {
    await notify([parentAuthorId], { type: "comment_reply", actorId: userId, targetId: postId, key: comment.id, repeat: "once" });
  }
  return { comments: (await getComments(postId, userId)) ?? [] };
}

export async function deleteCommentAction(commentId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "Log in first." };
  if (!uuid.safeParse(commentId).success) return { error: "That comment was already deleted." };
  const comment = await db.query.postComments.findFirst({ where: eq(postComments.id, commentId), columns: { postId: true, authorId: true } });
  if (!comment) return { error: "That comment was already deleted." };
  const post = await visiblePost(comment.postId, session.user.id);
  // Authors delete their own; a nonprofit can remove any comment on its posts.
  if (!post || (comment.authorId !== session.user.id && post.nonprofitId !== session.user.id)) {
    return { error: "You can only delete your own comments." };
  }
  // Replies go with it (cascade); so do notifications pointing at it.
  await db.delete(postComments).where(eq(postComments.id, commentId));
  await db.delete(notifications).where(eq(notifications.groupKey, `comment_reply:${commentId}`));
  return {};
}

/** Sets the viewer's reaction to a comment, or clears it (null). */
export async function reactToCommentAction(
  commentId: string,
  reaction: Reaction | null,
): Promise<{ reactions: CommentView["reactions"]; viewerReaction: Reaction | null } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Log in to react." };
  if (!uuid.safeParse(commentId).success || (reaction !== null && !reactionEnum.enumValues.includes(reaction))) {
    return { error: "That comment was deleted." };
  }
  const userId = session.user.id;
  const comment = await db.query.postComments.findFirst({ where: eq(postComments.id, commentId), columns: { postId: true, authorId: true } });
  if (!comment || !(await visiblePost(comment.postId, userId))) return { error: "That comment was deleted." };

  if (reaction === null) {
    await db.delete(commentReactions).where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, userId)));
  } else {
    const [row] = await db
      .insert(commentReactions)
      .values({ commentId, userId, reaction })
      .onConflictDoUpdate({ target: [commentReactions.commentId, commentReactions.userId], set: { reaction } })
      .returning({ at: commentReactions.createdAt });
    // Grouped per comment, like post likes: "Maya and 2 others reacted to your comment".
    await notify([comment.authorId], { type: "comment_reactions", actorId: userId, targetId: comment.postId, key: commentId, repeat: "bump", at: row.at });
  }
  const fresh = (await getComments(comment.postId, userId))?.find((c) => c.id === commentId);
  return { reactions: fresh?.reactions ?? [], viewerReaction: fresh?.viewerReaction ?? null };
}
