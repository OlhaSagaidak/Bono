import "server-only";
import { and, cosineDistance, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { causes, donations, follows, nonprofitProfiles, postCauses, postLikes, posts, userInterests, userVectors } from "@/db/schema";
import { AiUnavailableError, cachedCompletion } from "@/lib/ai/claude";
import { activeBoostSponsors } from "@/lib/boosts/queries";

// "Why am I seeing this?": one short sentence built from the real reasons a
// post ranks for this person. The facts come from the same signals the ranking
// uses (rank.ts, learn.ts); Claude Haiku only turns them into a friendly
// sentence. Facts are coarse (yes/no, short lists), so many people share the
// same sentence and the cache answers most requests without calling Claude.

export type WhyFacts = {
  nonprofit: string;
  sharedCauses: string[]; // the post's causes that the person picked as interests
  follows: boolean;
  likedTheirPosts: boolean; // liked other posts from this nonprofit
  donatedToThem: boolean;
  similarToWhatYouEngageWith: boolean; // close to their learned interests
  popular: boolean; // liked or supported by many others
  postedToday: boolean;
  exploring: boolean; // none of the above: shown so other causes still surface
  boostedBy: string[]; // sponsors paying to boost this post right now
};

const POPULAR_AT = 5; // likes + donations
const SIMILAR_AT = 0.35; // cosine similarity, see rank.ts

export async function whyFacts(viewerId: string, postId: string): Promise<WhyFacts | null> {
  const [post] = await db
    .select({ nonprofitId: posts.nonprofitId, name: nonprofitProfiles.name, createdAt: posts.createdAt })
    .from(posts)
    .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, posts.nonprofitId))
    .where(eq(posts.id, postId));
  if (!post) return null;

  const [tags, interests, follow, liked, donated, popularity, vector] = await Promise.all([
    db
      .select({ slug: causes.slug, label: causes.label })
      .from(postCauses)
      .innerJoin(causes, eq(causes.slug, postCauses.causeSlug))
      .where(eq(postCauses.postId, postId)),
    db.select({ slug: userInterests.causeSlug }).from(userInterests).where(eq(userInterests.userId, viewerId)),
    db.query.follows.findFirst({ where: and(eq(follows.followerId, viewerId), eq(follows.nonprofitId, post.nonprofitId)) }),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(postLikes)
      .innerJoin(posts, eq(posts.id, postLikes.postId))
      .where(and(eq(postLikes.userId, viewerId), eq(posts.nonprofitId, post.nonprofitId))),
    db.query.donations.findFirst({
      where: and(eq(donations.donorId, viewerId), eq(donations.nonprofitId, post.nonprofitId), eq(donations.status, "completed")),
      columns: { id: true },
    }),
    db.execute<{ n: number }>(sql`select
        (select count(*) from ${postLikes} where post_id = ${postId}) +
        (select count(*) from ${donations} where post_id = ${postId} and status = 'completed') as n`),
    db.query.userVectors.findFirst({ where: eq(userVectors.userId, viewerId), columns: { embedding: true, signalCount: true } }),
  ]);

  const interestSlugs = new Set(interests.map((i) => i.slug));
  const sharedCauses = tags.filter((t) => interestSlugs.has(t.slug)).map((t) => t.label);

  // "Similar to what you engage with" only counts once someone has engaged
  // (signalCount > 0); before that, their vector is just their causes.
  let similar = false;
  if (vector && vector.signalCount > 0) {
    const [row] = await db
      .select({ similarity: sql<number>`1 - (${cosineDistance(posts.embedding, vector.embedding)})` })
      .from(posts)
      .where(eq(posts.id, postId));
    similar = Number(row?.similarity ?? 0) >= SIMILAR_AT;
  }

  const facts: WhyFacts = {
    nonprofit: post.name,
    sharedCauses,
    follows: Boolean(follow),
    likedTheirPosts: (liked[0]?.n ?? 0) > 0,
    donatedToThem: Boolean(donated),
    similarToWhatYouEngageWith: similar,
    popular: Number(popularity.rows[0]?.n ?? 0) >= POPULAR_AT,
    postedToday: Date.now() - post.createdAt.getTime() < 86_400_000,
    exploring: false,
    boostedBy: (await activeBoostSponsors([postId])).get(postId) ?? [],
  };
  facts.exploring =
    !facts.sharedCauses.length && !facts.follows && !facts.likedTheirPosts && !facts.donatedToThem && !facts.similarToWhatYouEngageWith;
  return facts;
}

/** Plain-words version, used when Claude isn't available. */
export function templateWhy(f: WhyFacts): string {
  if (f.boostedBy.length) return `${f.boostedBy.join(" and ")} paid to boost this post${f.sharedCauses.length ? `, and it's about ${f.sharedCauses.join(" and ").toLowerCase()}` : ""}.`;
  if (f.donatedToThem) return `You've donated to ${f.nonprofit} before.`;
  if (f.follows) return `You follow ${f.nonprofit}.`;
  if (f.sharedCauses.length) return `It's about ${f.sharedCauses.join(" and ").toLowerCase()}, which you said you care about.`;
  if (f.likedTheirPosts) return `You've liked posts from ${f.nonprofit}.`;
  if (f.similarToWhatYouEngageWith) return "It's similar to posts you've liked and read.";
  return "A cause you haven't explored yet, so your feed doesn't get narrow.";
}

export async function explainWhy(viewerId: string, postId: string): Promise<string | null> {
  const facts = await whyFacts(viewerId, postId);
  if (!facts) return null;
  try {
    const sentence = await cachedCompletion({
      kind: "why",
      system:
        "You explain to a person, in one friendly sentence of at most 20 words, why a nonprofit's post " +
        "appears in their social feed. Use only the facts given as JSON; never add reasons that aren't " +
        "true there. Address the person as \"you\". Mention the nonprofit by name when it helps. " +
        "Prefer the strongest reason: donated, follows, shared causes, liked their posts, similar to " +
        "what they engage with, popular, posted today. If \"exploring\" is true, say it's a cause they " +
        "haven't explored yet. If \"boostedBy\" lists sponsors, always say plainly that they paid to boost " +
        "it. Reply with the sentence only: no quotes, no emoji.",
      input: JSON.stringify(facts),
      maxTokens: 60,
    });
    // Keep the promise of a short line even if the model runs long, and never
    // let a paid boost go unmentioned.
    const tooLong = sentence.split(/\s+/).length > 25;
    const hidesBoost = facts.boostedBy.length > 0 && !/boost/i.test(sentence);
    return tooLong || hidesBoost ? templateWhy(facts) : sentence;
  } catch (error) {
    if (error instanceof AiUnavailableError) return templateWhy(facts);
    throw error;
  }
}
