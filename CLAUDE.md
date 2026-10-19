# Bono — project guide for Claude Code

Bono is a social media web app where **nonprofits are the influencers**. People scroll a feed of nonprofit posts "guilt free": mindfully and with purpose. They can follow, like and donate. Sponsors (companies) fund matching campaigns and boost posts. An AI feed learns what each person cares about.

Built solo by Olya for the **PayPal AI Hackathon** (Devpost). Submission deadline: **Thu Nov 12, 2026, 12:00 pm Pacific**. Judging: Dec 1–15. The repo is public and doubles as Olya's portfolio project.

---

## Hard rules (always follow)

1. **Never spend money.** Never sign up for services, buy anything, upgrade plans, start paid trials, or enter payment details. If a task needs a paid service, a new account or a purchase, **stop and tell Olya what is needed**. Only she makes payments.
2. **Never commit secrets.** All keys live in `.env` (already in `.gitignore`). Commit only `.env.example` with placeholder values. Never print secrets in logs, errors, README or commit messages. Sandbox account emails and passwords are secrets too: they go in `.env` or a gitignored local file, never in committed seed files.
3. **PayPal sandbox only.** Base API URL `https://api-m.sandbox.paypal.com`. All PayPal calls run **server-side**; the browser only gets the client ID. Never send amounts or totals from the browser as trusted values; compute and validate them on the server.
4. **Use the APIMatic PayPal Context Plugin** (installed in Claude Code as `paypal@context-plugins`) for every piece of PayPal integration work: orders, captures, payouts, webhooks, SDK setup. Do not write PayPal code from memory. (This is also required for the APIMatic sponsor prize.)
5. **Fictional organizations only.** Demo nonprofits and sponsors use invented names. Never use or imitate a real organization's name, logo or branding.
6. **Build in vertical slices.** Finish one feature end to end (DB → API → UI → manual test in sandbox) before starting the next. After each working slice, commit with a clear message and push.
7. **Free packages are fine; paid ones are not.** Installing open-source npm packages is OK. Anything that needs an account, API key or billing must go through Olya first.
8. **Keep the Anthropic API cheap.** Use `claude-haiku-5-5` only. Cache every LLM result in the database and never call the LLM twice for the same input. Keep `max_tokens` small. There is a hard $5 prepaid cap; if calls start failing for lack of credit, stop and tell Olya.
9. When unsure about a product decision, ask Olya instead of guessing.

---

## Users and roles

| Role | What they do |
|---|---|
| **User** | Signs up, picks interests, scrolls the AI feed, likes, follows, donates via PayPal. No PayPal account needed until they donate. |
| **Nonprofit** | Gets verified (EIN check + verification fee via PayPal), posts content, receives donations **directly into its own PayPal account**, sees its dashboard. |
| **Sponsor** | Funds matching campaigns, pays to boost posts, sees its dashboard. |
| **Platform (Bono)** | Olya's default sandbox Business account. Receives verification fees and sponsor payments, holds matching pools, sends matches via Payouts. |

There is **no volunteer role**. Do not build volunteer features.

---

## Features

### 1. Accounts and profiles
- Email + password sign-up via Auth.js, with a role chosen at sign-up.
- Users pick interests at onboarding (e.g. animals, climate, food security, refugees, youth, health, arts). This seeds their feed.
- Nonprofit profile: name, mission, cause categories, logo, posts, verified badge, PayPal payee (sandbox merchant email or merchant ID).
- Sponsor profile: name, logo, active campaigns.

### 2. Nonprofit verification (PayPal fee)
- The nonprofit enters its EIN. The server checks it against a tax-exempt lookup table:
  - Real path: a table loaded from the IRS Exempt Organizations data (Pub 78 / EO BMF bulk file). Load only what's needed; don't commit huge files.
  - Demo path: the fictional demo nonprofits use fictional EINs listed in a clearly labeled `demo_ein_registry` table, so the demo works. Label this honestly in the UI and README as demo data.
- If the EIN matches and the name is consistent, the nonprofit pays a one-time **verification fee** (configurable, default $25) through the PayPal button. Orders v2: create the order server-side, buyer approves, capture server-side. The payee is the platform account.
- On successful capture: set `verified = true` and show the badge. Store the order ID and capture ID.

### 3. Donations (core)
- A **Donate** button on posts and nonprofit profiles. The user picks an amount (presets plus custom).
- Orders v2, with the order's `purchase_units[].payee` set to **that nonprofit's sandbox merchant account**, so money goes directly to the nonprofit. Bono never holds donation money.
- Create and capture server-side. Record the donation (user, nonprofit, amount, PayPal IDs, status) after capture, and confirm it via webhook.
- Show a thank-you state, and show whether a sponsor match was triggered.

### 4. Sponsor matching campaigns
- A sponsor creates a campaign: cause category or specific nonprofits, match ratio (e.g. 1:1), per-donation cap, total pool, start/end dates.
- The sponsor funds the pool by paying the platform account (Orders v2, payee = platform).
- When a donation is captured and matches an active campaign with pool remaining, queue a **match payout**: PayPal **Payouts API** from the platform account to the nonprofit's sandbox account. Deduct from the pool and record the payout batch and item IDs and their status.
- Process payouts from a queue (a background job), not inline in the donate request. Make it idempotent: one match per donation, ever.

### 5. Boosted posts
- A sponsor pays a fixed fee (configurable) to boost a nonprofit's post for N days (Orders v2, payee = platform).
- Boosted posts get a ranking bonus in the feed and a visible "Boosted by <Sponsor>" label. Boosts must stay clearly labeled; never disguise them.

### 6. AI feed
- **Embeddings:** a free open-source model running inside the app via `@huggingface/transformers` (transformers.js), e.g. `Xenova/all-MiniLM-L6-v2` (384 dimensions). No API key, no cost. Embed each post (text + cause tags) once, when it's created. Store vectors in Postgres with **pgvector**.
- **Cold start:** the user's interest vector is the average of their chosen interests' embeddings.
- **Signals:** likes, follows, donations, and **dwell time** (how long a post is visible on screen, measured in the browser with IntersectionObserver and sent to the server in batches).
- **Learning:** update the user vector toward posts they engage with (a weighted moving average; stronger weights for donate > follow > like > long dwell). Recompute in a background job.
- **Ranking:** score = cosine similarity + engagement weight + freshness decay + boost bonus + a small exploration factor, so users still discover new causes. Exclude posts already seen recently.
- Keep the ranking code simple, readable and documented. Olya must be able to explain it in an interview.

### 7. AI text features (Anthropic API, Haiku)
- **Translate post:** a button on posts not in the user's language. Translate with Haiku, cache the result per (post, language), and show the original on toggle.
- **"Why am I seeing this?":** a short one-line explanation per post for the user, generated from the actual ranking factors (matched interests, engagement, boost). Generate lazily, cache it, keep it under ~20 words.
- All LLM calls are server-side. `ANTHROPIC_API_KEY` stays on the server.

### 8. Dashboards (AG Grid / AG Studio, sponsor tool)
- **Nonprofit dashboard:** donations over time, top donors, matched vs. direct donations, campaign progress.
- **Sponsor dashboard:** pool used vs. remaining, recipients, boost results.
- Use AG Studio's agent framework for natural-language questions ("show donations from the Acme match this month"), plus custom theming that matches Bono and at least one custom widget (e.g. a matching-pool progress meter).
- **Build this in week 4.** Olya starts the 45-day trial around **Nov 1** so the license covers judging. Don't install the trial before she says so.

---

### 9. Social layer (added Oct 19)
All of it respects the safe-space rule: unverified nonprofits stay invisible, so they can't post stories, reels or events or be messaged.
- **Layout (signed in, desktop):** top bar (logo; Home, Reels, Messages with unread count, Following, Events, Notifications bell with dropdown; account menu on the right); center column = stories row + the existing ranked feed (unchanged); left sidebar = recent chats + followed organizations; right sidebar = your upcoming events. Below `lg`, sidebars hide and the top bar becomes a compact icon bar.
- **Profiles for everyone:** photo + bio (max 300 characters, live counter) for supporters, nonprofits and sponsors (nonprofits and sponsors keep their logo as the photo). Upload through the `images` table, validated and resized/square-cropped on the server with sharp; default avatar. Supporter profile `/users/[id]`; nonprofit pages add bio, followers count, reels, upcoming events and a Message button. Owner-only edit, enforced in the Server Action.
- **Following page** `/following`: followed organizations with unfollow and search, plus "Discover organizations" by cause.
- **Saved posts:** bookmark on every post and reel (optimistic), private "Saved" tab on your own profile.
- **Stories:** verified nonprofits post a photo or short video (≤ 15 s, small file cap) with an optional caption and Donate/link sticker; expire after 24 h; stories row with unseen rings; full-screen viewer (tap/arrows, hold/space to pause, progress bars, Esc); views recorded, owner sees the count.
- **Reels:** verified nonprofits upload vertical MP4 videos (≤ 60 s) with caption and causes; `/reels` snap-scroll feed, muted autoplay of the visible one, like, save, share link, Donate.
- **Messages:** one-to-one between any two users; `/messages` inbox + conversation; text first (images only if time allows); polling, no paid real-time service; participants-only on the server; block and report; unread counts feed the top bar and sidebar.
- **Events:** verified nonprofits create/edit/cancel (title, description, cover, start/end stored in UTC and shown in the viewer's timezone, in person or online, causes, optional capacity). Any signed-in user responds Interested or Going (or clears it); counts shown; the organizer sees the lists. `/events` (followed orgs first, cause filter, "My events", "Hosting"), `/events/[id]`. Past events drop out; cancelled events show as cancelled to responders.
- **Notifications:** `notifications` table + one helper; new message, new follower, RSVP, new event/story from followed orgs, event starting within 24 h, event cancelled/changed, grouped likes. Bell dropdown (latest ~10, mark all read) and `/notifications`; polling for unread counts; never notify people about their own actions.
- **Media storage:** images and videos stay in Postgres (free) with strict caps: MP4 only for video, duration read from the file header (no ffmpeg on the server), uploads through a size-capped route, playback with byte-range support. Demo photos and videos come from Olya (gitignored `seed-media/`), never real organizations' branding.
- **Without a background worker** (free Render): expired stories are filtered out of every query and deleted after responses; event reminders are created lazily when notifications or events load, deduplicated.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript, responsive web app (mobile-first layout) |
| Styling | Tailwind CSS |
| Auth | Auth.js (credentials provider) |
| Database | Postgres + pgvector. Local Postgres for development; **Render Postgres** in production |
| ORM | Prisma or Drizzle (pick one and stay consistent; pgvector support required) |
| Embeddings | transformers.js, local model, no API |
| LLM | Anthropic API, `claude-haiku-5-5` |
| Payments | PayPal sandbox: JS SDK v6 (browser), Orders v2, Payouts, webhooks (server) |
| Hosting | **Render**: web service + Postgres + a background worker or Render Workflows for embeddings, feed recompute and the payout queue (this is also for the Render sponsor prize) |
| Dashboards | AG Grid / AG Studio (week 4) |

Node version on Olya's Mac: v24.

### PayPal notes
- JS SDK v6 sandbox script: `https://www.sandbox.paypal.com/web-sdk/v6/core`. Initialize with `window.paypal.createInstance(...)`; check `findEligibleMethods()` before showing buttons.
- In v6, the `createOrder` callback must resolve to `{ orderId }`.
- Get an OAuth access token server-side from `/v1/oauth2/token` using the client ID and secret, and cache it until it expires.
- Use the `PayPal-Mock-Response` header or account-level Negative Testing to test declines and errors. Handle `INSTRUMENT_DECLINED` gracefully.
- Webhooks need a public URL. Use the Render deployment URL (or a tunnel during development) and verify webhook signatures.

---

## Environment variables (`.env`, never committed)

```
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_PLATFORM_MERCHANT_EMAIL=
ANTHROPIC_API_KEY=
DATABASE_URL=
AUTH_SECRET=
```

Create `.env.example` with the same names and placeholder values. Demo nonprofit and sponsor sandbox emails go in a gitignored `seed.local.json` (add it to `.gitignore`); provide a committed `seed.example.json` showing the shape with fake values.

---

## Demo data

- **5 fictional nonprofits:** Paws Haven (animals), Green Seattle (climate), Bright Futures (youth mentoring), Open Pantry (food security), New Roots Welcome Center (refugee support). Each maps to its own sandbox Business account (emails in `seed.local.json`).
- **2 fictional sponsors:** Acme and Northwind, each with its own sandbox Business account.
- **About 20 demo users** with varied interests and some engagement history, so the AI feed visibly adapts in the demo.
- **Posts:** realistic, varied content per nonprofit; some posts in Ukrainian and Spanish to show translation.
- Seed with one command (e.g. `npm run seed`).

---

## Build order

Dates are targets; the deadline is fixed.

| Week | Dates | Slices |
|---|---|---|
| 1 | Oct 12–18 | Project scaffold, local Postgres + pgvector, Auth.js sign-up with roles, onboarding interests, profiles, create posts with images, basic chronological feed, seed script |
| 2 | Oct 19–25 | PayPal: token helper, donations end to end (payee = nonprofit), verification (EIN check + fee), webhooks; first deploy to Render |
| 3 | Oct 26–Nov 1 | AI feed: embeddings, dwell-time tracking, user vectors, ranking; translation; "why am I seeing this" |
| 4 | Nov 2–8 | Sponsor matching campaigns + Payouts queue, boosted posts, AG Grid dashboards |
| 5 | Nov 9–12 | Polish, mobile layout, error states, README, demo video (under 3 min), Devpost submission. **Submit by Nov 11 to be safe.** |

Progress (Oct 19): weeks 1–3 and week 4's matching, Payouts and boosted posts are done and live; mobile polish and error states done early. AG Grid dashboards wait for the AG Studio trial (Olya starts it around Nov 1).

**Social layer (Oct 19 → ~Nov 1, before the dashboards),** one slice at a time, each committed and pushed:
1. Layout shell (top bar, three columns, responsive)
2. Profiles for all users (photo + bio)
3. Following page + left-sidebar following list
4. Events + RSVPs + right sidebar
5. Notifications
6. Messages + left-sidebar recent chats
7. Saved posts
8. Stories
9. Reels

**Never cut, top priority:** donations, verification, matching, the AI feed. If behind schedule, Olya decides what to cut among the social-layer slices, AG Grid natural-language agent, boosted posts and dashboards at that point.

---

## Submission checklist (hackathon requirements)

- [ ] Public GitHub repo with an MIT license visible in the About section
- [ ] README: pitch, screenshots/GIF, live demo URL, video link, architecture, setup and run instructions, **sandbox test-account logins for judges** (judge-only sandbox accounts, not secrets used elsewhere), tech stack, "Built with Claude Code + APIMatic Context Plugin"
- [ ] Working hosted demo on Render that stays up through Dec 15
- [ ] Demo video under 3 minutes on YouTube, showing the full flow working end to end
- [ ] Devpost text description: problem, audience, how PayPal and AI are used, sponsor tools used
- [ ] No secrets anywhere in the repo or its history

---

## Code style

- TypeScript strict mode. Small, readable modules. Comments explain *why*, not *what*.
- Keep PayPal, LLM and embedding code in separate server-only modules (e.g. `lib/paypal/`, `lib/ai/`, `lib/feed/`).
- Clear, honest error messages for users ("Your payment was declined. Try another payment method.").
- Accessible UI: labels on inputs, keyboard navigation, sufficient color contrast.
