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
import { existsSync, readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { and, count, eq, inArray, like, notInArray, sql, type SQL } from "drizzle-orm";
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
  userVectors,
  eventCauses,
  eventRsvps,
  events,
  follows,
  postLikes,
  postSaves,
  postViews,
  verificationFees,
  donations,
  notifications,
  conversations,
  conversationMembers,
  messages,
} from "@/db/schema";
import { embedCauses, embedPosts } from "@/lib/ai/embed-posts";
import { fitImage, replaceImage, squarePhoto } from "@/lib/images";
import { conversations as demoConversations, judgeEins, nonprofits, youngJudgeEin, postPhotoAlt, sponsors, supporters } from "./seed-data";
import { seedComments } from "./seed-comments";
import { seedReels } from "./seed-reels";
import { seedStories } from "./seed-stories";

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

/** "YYYY-MM-DD", `months` before `now` (for dates that must stay recent on every run). */
function monthsBefore(now: number, months: number): string {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

// "Lucía Herrera" -> "lucia.herrera@bono.example"
const loginEmail = (name: string) =>
  `${name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")}@${DEMO_DOMAIN}`;

/**
 * `daysAhead` days from now at `hour`:00 Seattle time, as a UTC Date. Uses the
 * real Pacific offset for that date, so it's right on both sides of DST.
 */
function seattleTime(now: number, daysAhead: number, hour: number): Date {
  const day = new Date(now + daysAhead * 86_400_000);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", dateStyle: "short" }).format(day);
  const guess = new Date(`${ymd}T${String(hour).padStart(2, "0")}:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" })
    .formatToParts(guess)
    .find((p) => p.type === "timeZoneName")!.value; // e.g. "GMT-7"
  const hours = Number(offset.replace("GMT", "") || 0);
  return new Date(guess.getTime() - hours * 3_600_000);
}

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
    // The labeled registry of fictional EINs: the demo nonprofits, plus spares for judges.
    await tx
      .insert(demoEinRegistry)
      .values([
        // The demo nonprofits have been tax-exempt for years (fictional dates).
        ...nonprofits.map((n, i) => ({ ein: n.ein, name: n.name, rulingDate: `${2008 + i}-03-01` })),
        ...judgeEins,
        { ein: youngJudgeEin.ein, name: youngJudgeEin.name, rulingDate: monthsBefore(now, youngJudgeEin.monthsAgo) },
      ])
      .onConflictDoUpdate({ target: demoEinRegistry.ein, set: { name: sql`excluded.name`, rulingDate: sql`excluded.ruling_date` } });

    const removed = reset
      ? (await tx.delete(users).where(like(users.email, `%@${DEMO_DOMAIN}`)).returning({ id: users.id })).length
      : 0;

    // Matched by email, so the account (and its history) is kept on re-runs.
    const upsertUser = async (email: string, name: string, role: "user" | "nonprofit" | "sponsor", bio = "") => {
      const [row] = await tx
        .insert(users)
        .values({ email, name, role, passwordHash, bio, onboardedAt: new Date(now) })
        .onConflictDoUpdate({ target: users.email, set: { name, role, passwordHash, bio } })
        .returning({ id: users.id });
      return row.id;
    };

    // Optional photos Olya provides in seed-media/profiles/<login name>.(jpg|png|webp)
    // (gitignored). Squared and resized like any upload; replaces the previous one.
    const photoFor = async (loginName: string, ownerId: string, currentId: string | null): Promise<string | null> => {
      const file = ["jpg", "jpeg", "png", "webp"].map((ext) => `seed-media/profiles/${loginName}.${ext}`).find((f) => existsSync(f));
      if (!file) return currentId;
      const photo = await squarePhoto({ kind: "ok", contentType: "image/jpeg", data: readFileSync(file) });
      return replaceImage(tx, ownerId, photo, currentId);
    };

    let postCount = 0;
    const seededPostIds: string[] = [];
    for (const np of nonprofits) {
      const id = await upsertUser(`${np.slug}@${DEMO_DOMAIN}`, np.name, "nonprofit", np.bio);
      const currentLogo =
        (await tx.select({ logo: nonprofitProfiles.logoImageId }).from(nonprofitProfiles).where(eq(nonprofitProfiles.userId, id)))[0]?.logo ?? null;
      const profile = {
        name: np.name,
        mission: np.mission,
        paypalPayeeEmail: config.nonprofits[np.slug].toLowerCase(),
        logoImageId: await photoFor(np.slug, id, currentLogo),
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
        // An optional photo from seed-media/posts/<slug>-<n>.jpg, resized like uploads.
        const photoKey = `${np.slug}-${i + 1}`;
        const photoFile = ["jpg", "jpeg", "png", "webp"].map((ext) => `seed-media/posts/${photoKey}.${ext}`).find((f) => existsSync(f));
        const currentPhoto = (await tx.select({ imageId: posts.imageId }).from(posts).where(eq(posts.id, postId)))[0]?.imageId ?? null;
        const photo = photoFile
          ? {
              imageId: await replaceImage(tx, id, await fitImage({ kind: "ok", contentType: "image/jpeg", data: readFileSync(photoFile) }), currentPhoto),
              imageAlt: postPhotoAlt[photoKey] ?? `Photo from ${np.name}`,
            }
          : {};
        const values = {
          nonprofitId: id,
          body: post.body,
          language: post.language ?? "en",
          createdAt: hoursAgo(post.hoursAgo),
          ...photo,
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
      const id = await upsertUser(`${sp.slug}@${DEMO_DOMAIN}`, sp.name, "sponsor", sp.bio);
      const currentLogo = (await tx.select({ logo: sponsorProfiles.logoImageId }).from(sponsorProfiles).where(eq(sponsorProfiles.userId, id)))[0]?.logo ?? null;
      const profile = { name: sp.name, logoImageId: await photoFor(sp.slug, id, currentLogo) };
      await tx
        .insert(sponsorProfiles)
        .values({ userId: id, ...profile })
        .onConflictDoUpdate({ target: sponsorProfiles.userId, set: profile });
    }

    // Events: two upcoming per verified demo nonprofit, dated relative to today
    // (so they never go stale), with RSVPs from supporters who share a cause.
    const seededEvents: { id: string; causes: string[] }[] = [];
    for (const np of nonprofits) {
      if (np.unverified || !np.events) continue;
      const [org] = await tx.select({ id: users.id }).from(users).where(eq(users.email, `${np.slug}@${DEMO_DOMAIN}`));
      for (const [i, ev] of np.events.entries()) {
        const id = stableId(`event:${np.slug}:${i}`);
        const startsAt = seattleTime(now, ev.daysAhead, ev.startHour);
        const coverFile = ["jpg", "jpeg", "png", "webp"].map((ext) => `seed-media/events/${np.slug}-${i + 1}.${ext}`).find((f) => existsSync(f));
        const current = (await tx.select({ cover: events.coverImageId }).from(events).where(eq(events.id, id)))[0]?.cover ?? null;
        const coverImageId = coverFile
          ? await replaceImage(tx, org.id, await fitImage({ kind: "ok", contentType: "image/jpeg", data: readFileSync(coverFile) }), current)
          : current;
        const values = {
          nonprofitId: org.id,
          title: ev.title,
          description: ev.description,
          startsAt,
          endsAt: new Date(startsAt.getTime() + ev.hours * 3_600_000),
          locationType: ev.online ? ("online" as const) : ("in_person" as const),
          address: ev.online ? null : (ev.address ?? null),
          onlineUrl: ev.online ? "https://meet.example.com/bono-demo" : null,
          capacity: ev.capacity ?? null,
          status: "scheduled" as const,
          coverImageId,
        };
        await tx.insert(events).values({ id, ...values }).onConflictDoUpdate({ target: events.id, set: values });
        await tx.delete(eventCauses).where(eq(eventCauses.eventId, id));
        await tx.insert(eventCauses).values(np.causes.map((causeSlug) => ({ eventId: id, causeSlug })));
        seededEvents.push({ id, causes: np.causes });
      }
    }

    // Seeded posts by cause, and the nonprofit behind each, for engagement history below.
    const seededPosts = nonprofits.flatMap((np) =>
      np.posts.map((post, i) => ({ id: stableId(`post:${np.slug}:${i}`), nonprofitSlug: np.slug, causes: post.causes ?? np.causes })),
    );
    const nonprofitIds = new Map<string, string>();
    for (const np of nonprofits) {
      const [row] = await tx.select({ id: users.id }).from(users).where(eq(users.email, `${np.slug}@${DEMO_DOMAIN}`));
      nonprofitIds.set(np.slug, row.id);
    }

    for (const s of supporters) {
      const id = await upsertUser(loginEmail(s.name), s.name, "user", s.bio);
      const [me] = await tx.select({ avatar: users.avatarImageId }).from(users).where(eq(users.id, id));
      await tx.update(users).set({ avatarImageId: await photoFor(loginEmail(s.name).split("@")[0], id, me.avatar) }).where(eq(users.id, id));
      await tx.delete(userInterests).where(eq(userInterests.userId, id));
      await tx.insert(userInterests).values(s.interests.map((causeSlug) => ({ userId: id, causeSlug })));

      // Some history, so the AI feed has something to learn from in the demo
      // (long looks are dated 4+ days ago, so they don't count as "recently seen"):
      // likes and long looks mostly within their causes, the odd one outside,
      // and a follow. Chosen deterministically (same picks every run) and
      // added only if missing, so real activity is never overwritten.
      const pick = (key: string) => parseInt(createHash("sha256").update(`${s.name}:${key}`).digest("hex").slice(0, 8), 16) / 2 ** 32;
      const mine = seededPosts.filter((p) => p.causes.some((c) => s.interests.includes(c)));
      const others = seededPosts.filter((p) => !mine.includes(p));
      const liked = [...mine.filter((p) => pick(`like:${p.id}`) < 0.35), ...others.filter((p) => pick(`like:${p.id}`) < 0.05)];
      const looked = mine.filter((p) => !liked.includes(p) && pick(`look:${p.id}`) < 0.4);
      if (liked.length) await tx.insert(postLikes).values(liked.map((p) => ({ userId: id, postId: p.id }))).onConflictDoNothing();
      // A couple of liked posts are also saved, so the Saved tab has something in it.
      const saved = liked.filter((p) => pick(`save:${p.id}`) < 0.4).slice(0, 3);
      if (saved.length) await tx.insert(postSaves).values(saved.map((p) => ({ userId: id, postId: p.id }))).onConflictDoNothing();
      if (looked.length) {
        await tx
          .insert(postViews)
          .values(looked.map((p) => ({ userId: id, postId: p.id, dwellMs: 8_000 + Math.round(pick(`ms:${p.id}`) * 20_000), lastSeenAt: hoursAgo(96 + pick(`at:${p.id}`) * 200) })))
          .onConflictDoNothing();
      }
      const favourite = mine.length ? mine[Math.floor(pick("follow") * mine.length)].nonprofitSlug : null;
      if (favourite) await tx.insert(follows).values({ followerId: id, nonprofitId: nonprofitIds.get(favourite)! }).onConflictDoNothing();
      await tx.delete(userVectors).where(eq(userVectors.userId, id)); // recompute from the (new) history

      // Responses to events in their causes. Added only if missing: real ones stay.
      const rsvps = seededEvents
        .filter((ev) => ev.causes.some((c) => s.interests.includes(c)))
        .flatMap((ev): (typeof eventRsvps.$inferInsert)[] => {
          const roll = pick(`rsvp:${ev.id}`);
          return roll < 0.3 ? [{ eventId: ev.id, userId: id, status: "going" }] : roll < 0.65 ? [{ eventId: ev.id, userId: id, status: "interested" }] : [];
        });
      if (rsvps.length) await tx.insert(eventRsvps).values(rsvps).onConflictDoNothing();
    }

    // Demo conversations, added only the first time (real messages are never touched).
    // Each person has read up to their own last message, so replies show as unread.
    for (const c of demoConversations) {
      const ids: string[] = [];
      for (const login of c.between) {
        const [row] = await tx.select({ id: users.id }).from(users).where(eq(users.email, `${login}@${DEMO_DOMAIN}`));
        if (!row) throw new Error(`Demo conversation: no account ${login}@${DEMO_DOMAIN}`);
        ids.push(row.id);
      }
      const [userLow, userHigh] = [...ids].sort();
      await tx.insert(conversations).values({ userLow, userHigh }).onConflictDoNothing();
      const [conv] = await tx
        .select({ id: conversations.id, last: conversations.lastMessageAt })
        .from(conversations)
        .where(and(eq(conversations.userLow, userLow), eq(conversations.userHigh, userHigh)));
      if (conv.last) continue;
      const rows = c.messages.map(([from, body, h]) => ({ conversationId: conv.id, senderId: ids[from], body, createdAt: hoursAgo(h) }));
      await tx.insert(messages).values(rows);
      const lastAt = rows.at(-1)!.createdAt;
      await tx.update(conversations).set({ lastMessageAt: lastAt }).where(eq(conversations.id, conv.id));
      for (const [i, userId] of ids.entries()) {
        const mine = rows.filter((r) => r.senderId === userId).at(-1)?.createdAt ?? hoursAgo(1000);
        await tx.insert(conversationMembers).values({ conversationId: conv.id, userId, lastReadAt: mine }).onConflictDoNothing();
        const lastFromOther = rows.filter((r) => r.senderId !== userId).at(-1);
        if (lastFromOther && lastFromOther.createdAt > mine) {
          await tx
            .insert(notifications)
            .values({ recipientId: userId, type: "message", actorId: ids[1 - i], targetId: conv.id, groupKey: `message:${conv.id}`, createdAt: lastFromOther.createdAt })
            .onConflictDoNothing();
        }
      }
    }

    // Fresh stories for the verified demo nonprofits (they expire after a day).
    const supporterIds = (
      await tx.select({ id: users.id }).from(users).where(inArray(users.email, supporters.map((s) => loginEmail(s.name))))
    ).map((r) => r.id);
    const storyCount = await seedStories(
      tx,
      now,
      nonprofits.filter((n) => !n.unverified).map((n) => ({ slug: n.slug, name: n.name, id: nonprofitIds.get(n.slug)! })),
      supporterIds,
    );

    // Reels from seed-media/reels, if Olya added any (they don't expire, so they're added once).
    const supporterRows = await tx.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, supporterIds));
    const reelCount = await seedReels(
      tx,
      now,
      nonprofits.filter((n) => !n.unverified).map((n) => ({ slug: n.slug, id: nonprofitIds.get(n.slug)!, causes: n.causes })),
      supporterRows.map((r) => ({ id: r.id, interests: supporters.find((s) => loginEmail(s.name) === r.email)?.interests ?? [] })),
      stableId,
    );

    // Comments, replies and reactions on a few demo posts.
    const commentCount = await seedComments(tx, now, DEMO_DOMAIN, (org, n) => stableId(`post:${org}:${n}`), stableId);

    // Notifications for the history above, so bells aren't empty in the demo:
    // follows, RSVPs and likes for the nonprofits, new events for followers.
    // Dated like what they're about; about a third start out read. Existing
    // ones are left alone (on conflict do nothing), so read state survives re-runs.
    const demo = sql`(select id from ${users} where email like ${`%@${DEMO_DOMAIN}`})`;
    const someRead = (key: SQL) => sql`case when abs(hashtext(${key})) % 3 = 0 then now() end`;
    await tx.execute(sql`
      insert into ${notifications} (recipient_id, type, actor_id, target_id, group_key, created_at, since_at, read_at)
      select f.nonprofit_id, 'follow'::notification_type, f.follower_id, null::uuid, 'follow:' || f.follower_id, f.created_at, f.created_at, ${someRead(sql`f.follower_id::text`)}
      from ${follows} f where f.nonprofit_id in ${demo} and f.follower_id in ${demo}
      union all
      select e.nonprofit_id, 'rsvp'::notification_type, r.user_id, e.id, 'rsvp:' || e.id || ':' || r.user_id, r.created_at, r.created_at, ${someRead(sql`r.user_id::text || e.id`)}
      from ${eventRsvps} r join ${events} e on e.id = r.event_id where e.nonprofit_id in ${demo} and r.user_id in ${demo}
      union all
      select f.follower_id, 'event_new'::notification_type, e.nonprofit_id, e.id, 'event_new:' || e.id, e.created_at, e.created_at, ${someRead(sql`f.follower_id::text || e.id`)}
      from ${events} e join ${follows} f on f.nonprofit_id = e.nonprofit_id where e.nonprofit_id in ${demo} and f.follower_id in ${demo}
      union all
      select p.nonprofit_id, 'post_likes'::notification_type, (array_agg(l.user_id order by l.created_at desc))[1], p.id, 'post_likes:' || p.id,
             max(l.created_at), min(l.created_at), ${someRead(sql`p.id::text`)}
      from ${postLikes} l join ${posts} p on p.id = l.post_id where p.nonprofit_id in ${demo} and l.user_id in ${demo}
      group by p.id, p.nonprofit_id
      on conflict (recipient_id, group_key) do nothing`);

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

    return { removed, posts: postCount, keptDonations, keptFees, seededPostIds, storyCount, reelCount, commentCount };
  });

  // Vectors for the AI feed. Seeded posts are re-embedded every run, since
  // their text may have changed in seed-data.ts.
  await embedCauses();
  await embedPosts({ postIds: result.seededPostIds, onlyMissing: false });

  console.log(
    `Seeded ${nonprofits.length} nonprofits (${nonprofits.filter((n) => n.unverified).length} unverified), ` +
      `${sponsors.length} sponsors, ${supporters.length} supporters, ${result.posts} posts, ${result.storyCount} stories, ${result.reelCount} reels and ${result.commentCount} new comments.`,
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
