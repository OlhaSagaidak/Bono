// `npm run seed`: creates or updates the demo accounts, profiles and posts.
//
// Safe to run again, and it keeps history: accounts are matched by email and
// posts by a stable id, so donations and verification fees made in the
// sandbox survive a re-run. A nonprofit seeded unverified keeps whatever
// verification it has earned since.
//
// `npm run seed -- --reset` instead deletes every account on the demo email
// domain (with all their posts, donations and fees) and starts clean, e.g.
// before recording the demo. Accounts on any other domain are never touched.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { and, count, eq, inArray, like, notInArray, sql } from "drizzle-orm";
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
  verificationFees,
  donations,
} from "@/db/schema";
import { embedCauses, embedPosts } from "@/lib/ai/embed-posts";
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

// A fixed UUID per seeded post, so a re-run updates the post instead of adding
// a copy (and anything pointing at it, like a donation, stays attached).
function stableId(key: string): string {
  const h = createHash("sha256").update(`bono-seed:${key}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function main() {
  const reset = process.argv.includes("--reset");
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

  const result = await db.transaction(async (tx) => {
    // The labeled registry of fictional EINs the demo nonprofits verify against.
    await tx
      .insert(demoEinRegistry)
      .values(nonprofits.map((n) => ({ ein: n.ein, name: n.name })))
      .onConflictDoUpdate({ target: demoEinRegistry.ein, set: { name: sql`excluded.name` } });

    const removed = reset
      ? (await tx.delete(users).where(like(users.email, `%@${DEMO_DOMAIN}`)).returning({ id: users.id })).length
      : 0;

    // Matched by email, so the account (and its history) is kept on re-runs.
    const upsertUser = async (email: string, name: string, role: "user" | "nonprofit" | "sponsor") => {
      const [row] = await tx
        .insert(users)
        .values({ email, name, role, passwordHash, onboardedAt: new Date(now) })
        .onConflictDoUpdate({ target: users.email, set: { name, role, passwordHash } })
        .returning({ id: users.id });
      return row.id;
    };

    let postCount = 0;
    const seededPostIds: string[] = [];
    for (const np of nonprofits) {
      const id = await upsertUser(`${np.slug}@${DEMO_DOMAIN}`, np.name, "nonprofit");
      const profile = {
        name: np.name,
        mission: np.mission,
        paypalPayeeEmail: config.nonprofits[np.slug].toLowerCase(),
      };
      // Verified demo nonprofits come with their demo EIN. One seeded
      // unverified starts with neither, and a re-run leaves whatever
      // verification it has earned since untouched.
      const verification = {
        ein: np.ein,
        einSource: "demo" as const,
        einCheckedAt: new Date(now),
        verifiedAt: new Date(now),
      };
      await tx
        .insert(nonprofitProfiles)
        .values({ userId: id, ...profile, ...(np.unverified ? {} : verification) })
        .onConflictDoUpdate({
          target: nonprofitProfiles.userId,
          set: np.unverified
            ? profile
            : { ...profile, ...verification, verifiedAt: sql`coalesce(${nonprofitProfiles.verifiedAt}, now())` },
        });
      await tx.delete(nonprofitCauses).where(eq(nonprofitCauses.nonprofitId, id));
      await tx.insert(nonprofitCauses).values(np.causes.map((causeSlug) => ({ nonprofitId: id, causeSlug })));

      // Earlier seed versions gave posts random ids; drop those copies so the
      // stable-id posts below don't duplicate them. Posts written by hand differ in text.
      const seededIds = np.posts.map((_, i) => stableId(`post:${np.slug}:${i}`));
      if (np.posts.length > 0) {
        await tx
          .delete(posts)
          .where(
            and(
              eq(posts.nonprofitId, id),
              inArray(posts.body, np.posts.map((p) => p.body)),
              notInArray(posts.id, seededIds),
            ),
          );
      }

      for (const [i, post] of np.posts.entries()) {
        const postId = seededIds[i];
        const values = {
          nonprofitId: id,
          body: post.body,
          language: post.language ?? "en",
          createdAt: hoursAgo(post.hoursAgo),
        };
        await tx.insert(posts).values({ id: postId, ...values }).onConflictDoUpdate({ target: posts.id, set: values });
        await tx.delete(postCauses).where(eq(postCauses.postId, postId));
        await tx
          .insert(postCauses)
          .values((post.causes ?? np.causes).map((causeSlug) => ({ postId, causeSlug })));
        postCount++;
        seededPostIds.push(postId);
      }
    }

    // Sponsors pay as buyers, so their sandbox emails aren't stored yet; they
    // are needed to log in to the PayPal sandbox when funding campaigns (week 4).
    for (const sp of sponsors) {
      const id = await upsertUser(`${sp.slug}@${DEMO_DOMAIN}`, sp.name, "sponsor");
      const profile = { name: sp.name, about: sp.about };
      await tx
        .insert(sponsorProfiles)
        .values({ userId: id, ...profile })
        .onConflictDoUpdate({ target: sponsorProfiles.userId, set: profile });
    }

    for (const s of supporters) {
      const id = await upsertUser(loginEmail(s.name), s.name, "user");
      await tx.delete(userInterests).where(eq(userInterests.userId, id));
      await tx.insert(userInterests).values(s.interests.map((causeSlug) => ({ userId: id, causeSlug })));
    }

    // What history the demo accounts carry after this run.
    const demoUsers = tx.select({ id: users.id }).from(users).where(like(users.email, `%@${DEMO_DOMAIN}`));
    const [{ kept: keptDonations }] = await tx
      .select({ kept: count() })
      .from(donations)
      .where(inArray(donations.donorId, demoUsers));
    const [{ kept: keptFees }] = await tx
      .select({ kept: count() })
      .from(verificationFees)
      .where(inArray(verificationFees.nonprofitId, demoUsers));

    return { removed, posts: postCount, keptDonations, keptFees, seededPostIds };
  });

  // Vectors for the AI feed. Seeded posts are re-embedded every run, since
  // their text may have changed in seed-data.ts.
  await embedCauses();
  await embedPosts({ postIds: result.seededPostIds, onlyMissing: false });

  console.log(
    `Seeded ${nonprofits.length} nonprofits (${nonprofits.filter((n) => n.unverified).length} unverified), ` +
      `${sponsors.length} sponsors, ${supporters.length} supporters and ${result.posts} posts.`,
  );
  console.log(
    reset
      ? `Reset: removed ${result.removed} demo accounts and their history first.`
      : `Kept history: ${result.keptDonations} donations and ${result.keptFees} verification fees.`,
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
