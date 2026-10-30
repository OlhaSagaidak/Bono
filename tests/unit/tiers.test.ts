import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextSupporterStep, sponsorTier, supporterTier } from "@/lib/badges/tiers";

describe("supporter tiers", () => {
  it("starts at Rising with the first gift", () => {
    assert.equal(supporterTier(0, 0), null);
    assert.equal(supporterTier(1, 500), "rising");
  });

  it("goes up by number of gifts or by total, whichever comes first", () => {
    assert.equal(supporterTier(3, 1_500), "emerging"); // three small gifts
    assert.equal(supporterTier(1, 10_000), "emerging"); // one $100 gift
    assert.equal(supporterTier(6, 6_000), "established");
    assert.equal(supporterTier(2, 50_000), "established");
    assert.equal(supporterTier(12, 12_000), "champion");
    assert.equal(supporterTier(1, 100_000), "champion");
  });

  it("says what the next tier takes", () => {
    assert.deepEqual(nextSupporterStep(1, 2_500), { label: "Emerging", gifts: 2, cents: 7_500 });
    assert.deepEqual(nextSupporterStep(0, 0), { label: "Rising", gifts: 1, cents: 1 });
    assert.equal(nextSupporterStep(12, 0), null);
  });
});

describe("sponsor tiers", () => {
  it("counts matched gifts and boosts together", () => {
    assert.equal(sponsorTier(0), null);
    assert.equal(sponsorTier(1_500), "supporter"); // one boost
    assert.equal(sponsorTier(25_000), "partner");
    assert.equal(sponsorTier(100_000), "champion-partner");
  });
});
