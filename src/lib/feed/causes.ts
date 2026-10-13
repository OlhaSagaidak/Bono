// What each cause means, in a sentence. A bare label like "Arts" is a weak
// signal for the embedding model; a short description places the cause
// better, so a new supporter's first feed already leans the right way.
export const CAUSE_DESCRIPTIONS: Record<string, string> = {
  animals: "Animals: animal rescue, shelters, pet adoption, foster care for dogs and cats, wildlife.",
  climate: "Climate: climate change, planting trees, clean energy, restoring creeks and nature, cleaner air.",
  "food-security": "Food security: food banks, free meals, hunger relief, groceries for families in need.",
  refugees: "Refugees: refugee and immigrant support, resettlement, housing, English classes, legal help.",
  youth: "Youth: mentoring children and teens, tutoring, after-school programs, college access.",
  health: "Health: health care, clinics, nutrition, wellness, preventing illness, healthy communities.",
  arts: "Arts: art classes, music, poetry, murals, creative expression and culture for the community.",
};

export const causeEmbeddingText = (slug: string, label: string) => CAUSE_DESCRIPTIONS[slug] ?? label;
