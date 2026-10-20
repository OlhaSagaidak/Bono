import { sql } from "drizzle-orm";
import type { db as Db } from "@/db";
import { commentReactions, notifications, postComments, users } from "@/db/schema";
import { comments as demoComments } from "./seed-data";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

// Demo comments, replies and reactions, each with a fixed id so re-runs add
// only what's missing (real comments are never touched). Then notifications
// for them, like the other seeded history.
export async function seedComments(tx: Tx, now: number, domain: string, postId: (org: string, n: number) => string, stableId: (key: string) => string) {
  const ids = new Map((await tx.select({ id: users.id, email: users.email }).from(users)).map((u) => [u.email, u.id]));
  const who = (login: string) => {
    const id = ids.get(`${login}@${domain}`);
    if (!id) throw new Error(`Demo comment: no account ${login}@${domain}`);
    return id;
  };
  let count = 0;
  for (const thread of demoComments) {
    const post = postId(thread.org, thread.post);
    for (const [i, c] of thread.comments.entries()) {
      const topId = stableId(`comment:${thread.org}:${thread.post}:${i}`);
      const all = [{ ...c, id: topId, parentId: null as string | null }, ...(c.replies ?? []).map((r, j) => ({ ...r, id: stableId(`comment:${thread.org}:${thread.post}:${i}:${j}`), parentId: topId }))];
      for (const row of all) {
        const inserted = await tx
          .insert(postComments)
          .values({ id: row.id, postId: post, authorId: who(row.by), parentId: row.parentId, body: row.text, createdAt: new Date(now - row.hoursAgo * 3_600_000) })
          .onConflictDoNothing()
          .returning({ id: postComments.id });
        count += inserted.length;
        if (row.reactions?.length) {
          await tx
            .insert(commentReactions)
            .values(row.reactions.map(([login, reaction]) => ({ commentId: row.id, userId: who(login), reaction, createdAt: new Date(now - (row.hoursAgo - 1) * 3_600_000) })))
            .onConflictDoNothing();
        }
      }
    }
  }

  // "Commented on your post" (one per post) and "replied to your comment".
  await tx.execute(sql`
    insert into ${notifications} (recipient_id, type, actor_id, target_id, group_key, created_at, since_at)
    select p.nonprofit_id, 'post_comment'::notification_type, (array_agg(c.author_id order by c.created_at desc))[1], p.id, 'post_comment:' || p.id, max(c.created_at), min(c.created_at)
    from ${postComments} c join posts p on p.id = c.post_id
    where c.author_id <> p.nonprofit_id
    group by p.id, p.nonprofit_id
    on conflict (recipient_id, group_key) do nothing`);
  await tx.execute(sql`
    insert into ${notifications} (recipient_id, type, actor_id, target_id, group_key, created_at)
    select parent.author_id, 'comment_reply'::notification_type, c.author_id, c.post_id, 'comment_reply:' || c.id, c.created_at
    from ${postComments} c
    join ${postComments} parent on parent.id = c.parent_id
    join posts p on p.id = c.post_id
    where parent.author_id not in (c.author_id, p.nonprofit_id)
    on conflict (recipient_id, group_key) do nothing`);
  return count;
}
