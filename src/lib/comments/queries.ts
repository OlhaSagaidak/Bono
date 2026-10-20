import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { blocks, commentReactions, nonprofitProfiles, postComments, posts, sponsorProfiles, users, type Reaction, type Role } from "@/db/schema";
import { profilePath } from "@/lib/profiles/paths";

export type CommentView = {
  id: string;
  parentId: string | null;
  body: string;
  /** "en", "es" or "uk"; null when it was too short to tell. */
  language: string | null;
  createdAt: string; // ISO
  editedAt: string | null;
  author: { id: string; name: string; photoImageId: string | null; href: string };
  /** How many of each reaction, most used first. */
  reactions: { key: Reaction; count: number }[];
  viewerReaction: Reaction | null;
  /** The author, or the nonprofit whose post it is. */
  canDelete: boolean;
  /** Only the author edits; everyone else can report it. */
  mine: boolean;
};

/**
 * A post the viewer may see (and so comment on): one from a verified
 * nonprofit, or the nonprofit's own. Null otherwise: the safe-space rule.
 */
export async function visiblePost(postId: string, viewerId: string | null) {
  const [post] = await db
    .select({ nonprofitId: posts.nonprofitId, verifiedAt: nonprofitProfiles.verifiedAt })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(eq(posts.id, postId));
  if (!post || (!post.verifiedAt && post.nonprofitId !== viewerId)) return null;
  return { nonprofitId: post.nonprofitId };
}

/**
 * All comments on a post, oldest first (the UI nests replies under their
 * comment). Comments by people the viewer blocked, or who blocked the
 * viewer, are left out.
 */
export async function getComments(postId: string, viewerId: string): Promise<CommentView[] | null> {
  const post = await visiblePost(postId, viewerId);
  if (!post) return null;
  const rows = await db
    .select({
      id: postComments.id,
      parentId: postComments.parentId,
      body: postComments.body,
      language: postComments.language,
      createdAt: postComments.createdAt,
      editedAt: postComments.editedAt,
      authorId: users.id,
      authorRole: users.role,
      authorName: sql<string>`coalesce(${nonprofitProfiles.name}, ${sponsorProfiles.name}, ${users.name})`,
      authorPhoto: sql<string | null>`coalesce(${nonprofitProfiles.logoImageId}, ${sponsorProfiles.logoImageId}, ${users.avatarImageId})`,
      reactions: sql<{ key: Reaction; count: number }[]>`coalesce((
        select json_agg(json_build_object('key', r.reaction, 'count', r.n) order by r.n desc)
        from (select reaction, count(*)::int as n from ${commentReactions} where comment_id = ${postComments.id} group by reaction) r
      ), '[]'::json)`,
      viewerReaction: sql<Reaction | null>`(select reaction::text from ${commentReactions} where comment_id = ${postComments.id} and user_id = ${viewerId})`,
    })
    .from(postComments)
    .innerJoin(users, eq(users.id, postComments.authorId))
    .leftJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, users.id))
    .leftJoin(sponsorProfiles, eq(sponsorProfiles.userId, users.id))
    .where(
      and(
        eq(postComments.postId, postId),
        sql`not exists (select 1 from ${blocks} b where (b.blocker_id = ${viewerId} and b.blocked_id = ${users.id}) or (b.blocker_id = ${users.id} and b.blocked_id = ${viewerId}))`,
      ),
    )
    .orderBy(postComments.createdAt)
    .limit(500);

  return rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    body: r.body,
    language: r.language,
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt?.toISOString() ?? null,
    author: { id: r.authorId, name: r.authorName, photoImageId: r.authorPhoto, href: profilePath(r.authorRole as Role, r.authorId) },
    reactions: r.reactions,
    viewerReaction: r.viewerReaction,
    canDelete: r.authorId === viewerId || post.nonprofitId === viewerId,
    mine: r.authorId === viewerId,
  }));
}
