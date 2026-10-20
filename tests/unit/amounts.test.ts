import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { amountSchema, formatCents } from "@/lib/donations/amounts";

describe("donation amounts", () => {
  it("parses dollars into integer cents", () => {
    assert.equal(amountSchema.parse("25"), 2500);
    assert.equal(amountSchema.parse(" $12.5 "), 1250);
    assert.equal(amountSchema.parse("1.01"), 101);
  });

  it("refuses amounts outside $1–$10,000 and malformed input", () => {
    for (const bad of ["0.50", "10000.01", "12.345", "abc", "-5", ""]) assert.equal(amountSchema.safeParse(bad).success, false, bad);
  });

  it("formats cents for people", () => {
    assert.equal(formatCents(2500), "$25");
    assert.equal(formatCents(2550), "$25.50");
  });
});
