import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { causes, nonprofitCauses, nonprofitProfiles, posts } from "@/db/schema";
import { embedTexts } from "@/lib/ai/embeddings";
import { getPostsByIds } from "@/lib/posts/queries";

// Search across Bono. Organizations match by name, mission, bio or cause.
// Posts match by words, and also by meaning: the query is embedded with the
// same local model as the AI feed and compared with each post's vector, so
// "help for families arriving from Ukraine" finds New Roots' posts even when
// they use other words (or are written in Ukrainian; posts are embedded in
// English). No AI API is called.

export const QUERY_MAX = 100;
const ORG_LIMIT = 8;
const POST_LIMIT = 20;
// Cosine distance (0 = same meaning, 2 = opposite) above which a post is too
// far from the query to show as a match.
const MAX_DISTANCE = 0.65;

export type OrgResult = { id: string; name: string; mission: string; logoImageId: string | null; verified: boolean };

/** Escapes LIKE wildcards so a "%" in the query is just a percent sign. */
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * Organizations whose name, mission, bio or cause matches the words, then the
 * ones behind the posts that matched in meaning (`relatedIds`, most matches
 * first), so "help for refugee families" also finds New Roots.
 */
export async function searchOrganizations(q: string, relatedIds: string[] = []): Promise<OrgResult[]> {
  const like = likePattern(q);
  const related = relatedIds.length ? sql`array[${sql.join(relatedIds.map((id) => sql`${id}::uuid`), sql`, `)}]` : sql`array[]::uuid[]`;
  const { rows } = await db.execute<{ id: string; name: string; mission: string; logo: string | null; verified: boolean }>(sql`
    select n.user_id as id, n.name, n.mission, n.logo_image_id as logo, n.verified_at is not null as verified
    from ${nonprofitProfiles} n join users u on u.id = n.user_id
    where n.name ilike ${like} or n.mission ilike ${like} or u.bio ilike ${like}
       or exists (select 1 from ${nonprofitCauses} nc join ${causes} c on c.slug = nc.cause_slug
                  where nc.nonprofit_id = n.user_id and c.label ilike ${like})
       or n.user_id = any(${related})
    order by (n.name ilike ${like}) desc, (n.user_id = any(${related}) and not n.name ilike ${like}) asc,
             array_position(${related}, n.user_id), (n.verified_at is not null) desc, n.name
    limit ${ORG_LIMIT}`);
  return rows.map((r) => ({ id: r.id, name: r.name, mission: r.mission, logoImageId: r.logo, verified: r.verified }));
}

/** Posts from verified nonprofits: word matches first, then the closest in meaning. */
export async function searchPosts(q: string, viewerId: string) {
  const like = likePattern(q);
  const [vector] = await embedTexts([q]).catch(() => [null]);
  const { rows } = await db.execute<{ id: string }>(sql`
    select p.id from ${posts} p join ${nonprofitProfiles} n on n.user_id = p.nonprofit_id
    where n.verified_at is not null
      and (p.body ilike ${like}
           ${vector ? sql`or p.embedding <=> ${JSON.stringify(vector)}::vector < ${MAX_DISTANCE}` : sql``})
    order by (p.body ilike ${like}) desc
             ${vector ? sql`, p.embedding <=> ${JSON.stringify(vector)}::vector` : sql``}, p.created_at desc
    limit ${POST_LIMIT}`);
  const ids = rows.map((r) => r.id);
  const found = await getPostsByIds(ids, viewerId);
  // fetchedAt anchors "3 hours ago" on the cards to when the results were read.
  return { posts: ids.flatMap((id) => found.filter((p) => p.id === id)), fetchedAt: Date.now() };
}
