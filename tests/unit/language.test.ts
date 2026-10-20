import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectLanguage } from "@/lib/comments/language";

describe("comment language detection", () => {
  it("tells English, Spanish and Ukrainian apart", () => {
    assert.equal(detectLanguage("This made my day. Is Biscuit still looking for a home?"), "en");
    assert.equal(detectLanguage("¿Necesitan voluntarios que hablen español los sábados?"), "es");
    assert.equal(detectLanguage("Дякую за вашу роботу, ви робите велику справу!"), "uk");
  });

  it("treats a mixed Ukrainian/English comment as Ukrainian", () => {
    assert.equal(detectLanguage("Дякую за вашу роботу! Can I help with translation?"), "uk");
  });

  it("doesn't guess on very short comments", () => {
    assert.equal(detectLanguage("Thanks!"), null);
  });
});
