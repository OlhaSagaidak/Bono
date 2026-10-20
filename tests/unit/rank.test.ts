import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exploration, freshness, FRESHNESS_HALF_LIFE_HOURS, popularity, rankPosts, WEIGHTS, type Candidate } from "@/lib/feed/rank";

const HOUR = 3_600_000;
const now = Date.UTC(2026, 9, 20, 12);
const post = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  id,
  createdAt: new Date(now),
  similarity: 0,
  likes: 0,
  donations: 0,
  followed: false,
  boosted: false,
  seen: false,
  ...over,
});

describe("feed ranking", () => {
  it("halves freshness every half-life", () => {
    assert.equal(freshness(new Date(now), now), 1);
    assert.equal(freshness(new Date(now - FRESHNESS_HALF_LIFE_HOURS * HOUR), now), 0.5);
    assert.equal(freshness(new Date(now - 2 * FRESHNESS_HALF_LIFE_HOURS * HOUR), now), 0.25);
  });

  it("caps popularity at 1 and counts a donation as three likes", () => {
    assert.equal(popularity(0, 0), 0);
    assert.equal(popularity(3, 0), popularity(0, 1));
    assert.equal(popularity(10_000, 500), 1);
  });

  it("gives the same exploration nudge for the same viewer, post and day", () => {
    const a = exploration("viewer", "post", "2026-10-20");
    assert.equal(a, exploration("viewer", "post", "2026-10-20"));
    assert.notEqual(a, exploration("viewer", "post", "2026-10-21"));
    assert.ok(a >= 0 && a < 1);
  });

  it("puts unseen posts before seen ones, whatever their score", () => {
    const ranked = rankPosts([post("seen-but-perfect", { similarity: 1, seen: true }), post("unseen-plain")], "v", now);
    assert.deepEqual(ranked.map((p) => p.id), ["unseen-plain", "seen-but-perfect"]);
  });

  it("ranks a strong interest match above an unrelated boosted post", () => {
    // The boost is a nudge, not a takeover (see the comment in rank.ts).
    const ranked = rankPosts([post("boosted", { boosted: true, similarity: 0 }), post("match", { similarity: 0.6 })], "v", now);
    assert.equal(ranked[0].id, "match");
  });

  it("adds up the weighted factors into the score", () => {
    const [r] = rankPosts([post("p", { similarity: 0.5, followed: true })], "v", now);
    const expected = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce((s, k) => s + WEIGHTS[k] * r.factors[k], 0);
    assert.equal(r.score, expected);
    assert.equal(r.factors.relevance, 0.5);
    assert.equal(r.factors.followed, 1);
  });
});
