// `npm run seed`: (re)creates the demo accounts and posts.
//
// Safe to run again: it first deletes every account on the demo email domain
// (their profiles, posts and images go with them), then recreates them in one
// transaction. Accounts on any other domain are never touched.

import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { like, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  causes,
  demoEinRegistry,
  nonprofitCauses,
  nonprofitProfiles,
  postCauses,
  posts,
  sponsorProfiles,
  userInterests,
  users,
} from "@/db/schema";
import { nonprofits, sponsors, supporters } from "./seed-data";

// Bono login emails for demo accounts. `.example` is reserved, so these can
// never belong to a real person.
const DEMO_DOMAIN = "bono.example";

const localSchema = z.object({
  demoPassword: z.string().min(8, "demoPassword must be at least 8 characters."),
  nonprofits: z.record(z.string(), z.email()),
  sponsors: z.record(z.string(), z.email()),
});

function readLocalConfig() {
  let raw: string;
  try {
    raw = readFileSync("seed.local.json", "utf8");
  } catch {
    throw new Error("seed.local.json not found. Copy seed.example.json to seed.local.json and fill it in.");
  }
  const config = localSchema.parse(JSON.parse(raw));
  for (const { slug } of [...nonprofits, ...sponsors]) {
    const group = nonprofits.some((n) => n.slug === slug) ? config.nonprofits : config.sponsors;
    if (!group[slug]) throw new Error(`seed.local.json is missing a sandbox email for "${slug}".`);
  }
  return config;
}

// "Lucía Herrera" -> "lucia.herrera@bono.example"
const loginEmail = (name: string) =>
  `${name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")}@${DEMO_DOMAIN}`;

async function main() {
  const config = readLocalConfig();

  const known = new Set((await db.select({ slug: causes.slug }).from(causes)).map((c) => c.slug));
  const used = [...nonprofits.flatMap((n) => n.causes), ...supporters.flatMap((s) => s.interests)];
  const missing = used.filter((slug) => !known.has(slug));
  if (missing.length) {
    throw new Error(`Unknown causes ${[...new Set(missing)].join(", ")}. Run npm run db:migrate first.`);
  }

  // One hash for every demo login: they all share the password from seed.local.json.
  const passwordHash = await bcrypt.hash(config.demoPassword, 10);
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000);

  const counts = await db.transaction(async (tx) => {
    // The labeled registry of fictional EINs the demo nonprofits verify against.
    await tx
      .insert(demoEinRegistry)
      .values(nonprofits.map((n) => ({ ein: n.ein, name: n.name })))
      .onConflictDoUpdate({ target: demoEinRegistry.ein, set: { name: sql`excluded.name` } });

    const removed = await tx
      .delete(users)
      .where(like(users.email, `%@${DEMO_DOMAIN}`))
      .returning({ id: users.id });

    const createUser = async (email: string, name: string, role: "user" | "nonprofit" | "sponsor") => {
      const [row] = await tx
        .insert(users)
        .values({ email, name, role, passwordHash, onboardedAt: new Date(now) })
        .returning({ id: users.id });
      return row.id;
    };

    let postCount = 0;
    for (const np of nonprofits) {
      const id = await createUser(`${np.slug}@${DEMO_DOMAIN}`, np.name, "nonprofit");
      await tx.insert(nonprofitProfiles).values({
        userId: id,
        name: np.name,
        mission: np.mission,
        paypalPayeeEmail: config.nonprofits[np.slug].toLowerCase(),
        // Demo nonprofits start verified so the feed has content, with their
        // fictional EINs from the demo registry. (No fee record: seeded, not paid.)
        ein: np.ein,
        einSource: "demo",
        einCheckedAt: new Date(now),
        verifiedAt: new Date(now),
      });
      await tx.insert(nonprofitCauses).values(np.causes.map((causeSlug) => ({ nonprofitId: id, causeSlug })));

      for (const post of np.posts) {
        const [row] = await tx
          .insert(posts)
          .values({
            nonprofitId: id,
            body: post.body,
            language: post.language ?? "en",
            createdAt: hoursAgo(post.hoursAgo),
          })
          .returning({ id: posts.id });
        await tx
          .insert(postCauses)
          .values((post.causes ?? np.causes).map((causeSlug) => ({ postId: row.id, causeSlug })));
        postCount++;
      }
    }

    // Sponsors pay as buyers, so their sandbox emails aren't stored yet; they
    // are needed to log in to the PayPal sandbox when funding campaigns (week 4).
    for (const sp of sponsors) {
      const id = await createUser(`${sp.slug}@${DEMO_DOMAIN}`, sp.name, "sponsor");
      await tx.insert(sponsorProfiles).values({ userId: id, name: sp.name, about: sp.about });
    }

    for (const s of supporters) {
      const id = await createUser(loginEmail(s.name), s.name, "user");
      await tx.insert(userInterests).values(s.interests.map((causeSlug) => ({ userId: id, causeSlug })));
    }

    return { removed: removed.length, posts: postCount };
  });

  console.log(
    `Seeded ${nonprofits.length} nonprofits, ${sponsors.length} sponsors, ${supporters.length} supporters ` +
      `and ${counts.posts} posts (replaced ${counts.removed} earlier demo accounts).`,
  );
  console.log(
    `Log in as e.g. ${nonprofits[0].slug}@${DEMO_DOMAIN}, ${sponsors[0].slug}@${DEMO_DOMAIN} or ` +
      `${loginEmail(supporters[0].name)}, with the demoPassword from seed.local.json.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
