import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEin, MIN_EXEMPT_MONTHS, namesMatch, normalizeEin, verifiableFrom } from "@/lib/verification/ein-rules";

describe("EIN rules", () => {
  it("accepts EINs with or without the dash, and nothing else", () => {
    assert.equal(normalizeEin("12-3456789"), "123456789");
    assert.equal(normalizeEin(" 123456789 "), "123456789");
    assert.equal(normalizeEin("12-34567"), null);
    assert.equal(normalizeEin("ab-cdefghi"), null);
    assert.equal(formatEin("123456789"), "12-3456789");
  });

  it("matches the profile name against the IRS name, one way only", () => {
    assert.equal(namesMatch("Okanogan Regional Humane Society", "OKANOGAN REGIONAL HUMANE"), true);
    assert.equal(namesMatch("Open Pantry", "OPEN PANTRY INC"), true);
    assert.equal(namesMatch("Paws", "PAWS HAVEN"), false);
  });

  it(`allows verification ${MIN_EXEMPT_MONTHS} months after the IRS ruling date`, () => {
    assert.equal(verifiableFrom("2002-02-01"), "2002-08-01");
    assert.equal(verifiableFrom("2026-08-30"), "2027-02-28"); // no "Feb 30"
    assert.equal(verifiableFrom("2027-08-31"), "2028-02-29"); // leap year
    assert.equal(verifiableFrom("2025-12-15"), "2026-06-15");
  });
});
