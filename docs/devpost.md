# Devpost submission text

Draft for the Devpost form. Paste each section into the matching field.

## Tagline (short)

A social feed where nonprofits are the influencers: scroll guilt free, give in two taps with PayPal.

## Inspiration

We spend hours a day in feeds built to keep us scrolling, and charities compete there with
everything else, paying for ads to be seen. Giving, meanwhile, happens on a donation page you
only reach once you've already decided to give. I wanted a feed you could scroll without
guilt: only nonprofit stories, ranked by what you actually care about, where the step from
"this moved me" to "I helped" is one tap, and the money goes straight to the charity.

## What it does

Bono is a social media app where **nonprofits are the influencers**.

- **Supporters** pick the causes they care about and get an AI-ranked feed of posts, stories,
  reels and events from verified nonprofits. They like, comment, follow, message, RSVP and
  **donate with PayPal** from any post. Over time they earn public badges per nonprofit
  (Rising, Emerging, Established, Champion), shown as tiers and never as amounts.
- **Nonprofits** get verified (an EIN check against IRS records, at least 6 months
  tax-exempt, then a verification fee through PayPal). They post, and receive donations
  **directly into their own PayPal account**: Bono never holds donation money.
- **Sponsors** (companies) fund matching campaigns ("Acme matches gifts to animal shelters
  1:1, up to $25 each") and boost posts. Matches are paid to the nonprofit automatically
  with PayPal Payouts, and boosted posts are always labeled "Boosted by …".

## How we built it

- **Next.js 16** (App Router, Server Actions, TypeScript), Tailwind, Auth.js, **Postgres +
  pgvector** with Drizzle, hosted on **Render** (web service + Postgres).
- **PayPal**, all server-side through the APIMatic-generated **PayPal Server SDK**:
  - Donations: JS SDK v6 + Orders v2 with `purchase_units[].payee` set to the nonprofit.
  - Verification fees, sponsor pools and boosts: Orders v2 paid to the platform account.
  - Sponsor matches: the **Payouts API**, idempotent (one match per donation, and the match
    ID is the payout's `sender_batch_id`).
  - **Webhooks** with signature verification to confirm captures and payouts.
  - A popup on laptops and a same-tab redirect on phones, where popups are unreliable.
  - The server always chooses the payee and validates the amount; the browser only ever gets
    the client ID.
- **AI feed**, with no paid AI service: posts are embedded with the open-source
  all-MiniLM-L6-v2 model running inside the app (transformers.js) and stored in pgvector.
  Each person's interest vector starts from their chosen causes and learns from donations,
  follows, comments, likes and **dwell time** (how long a post stays on screen). Ranking is a
  simple, documented score: relevance + freshness + followed + popularity + boost + a little
  exploration so people still discover new causes.
- **Claude Haiku** translates posts and comments (some demo nonprofits post in Ukrainian and
  Spanish) and writes a one-line "Why am I seeing this?" from the real ranking factors. Every
  result is cached, so the same input never reaches the API twice.
- **Claude Code + the APIMatic PayPal Context Plugin**: every PayPal call was written from the
  plugin's SDK map (operations, request fields, error types), not from memory, with a
  contract sheet checked into the repo.

## Challenges we ran into

- **Paying the nonprofit, not the platform.** Donations set the payee per order, so each
  nonprofit needs its own PayPal account, and verification has to prove the account belongs
  to it: the fee must be paid from that same account.
- **Phones.** PayPal's popup is unreliable on mobile browsers, so phones approve in the same
  tab and come back to a return page where the server captures the order.
- **Fake charities.** Anyone can type a name. Bono checks the EIN on demand against IRS data
  (through ProPublica's Nonprofit Explorer) and requires 6 months of tax-exempt status, while
  letting new organizations take part as supporters until then.
- **Running free.** Embeddings run locally, LLM results are cached, and photos and short
  videos live in Postgres with strict size caps, so the whole demo runs on free plans.

## Accomplishments that we're proud of

- Money flows the way it should: donor → nonprofit directly, sponsor → pool → nonprofit via
  Payouts, with idempotency so nobody is ever paid twice.
- A feed that visibly adapts: donate to an animal shelter and animal posts rise.
- A full social app (stories, reels, messages, events, notifications, comments, badges) that
  works on a phone, built solo in a month, with unit, end-to-end and accessibility tests.

## What we learned

How PayPal's pieces fit together for a marketplace-style app (per-order payees, Payouts,
webhooks), how far a small local embedding model can go for personalization, and how much
faster and safer integration work gets when the AI coding agent reads the SDK's real
contract instead of guessing.

## What's next for Bono

- Nonprofit and sponsor dashboards with AG Grid.
- Onboarding real nonprofits with PayPal's partner onboarding instead of a pasted account email.
- Recurring donations and year-end giving receipts.

## Built with

nextjs, typescript, react, tailwindcss, postgresql, pgvector, drizzle, auth.js, paypal,
paypal-orders-v2, paypal-payouts, paypal-webhooks, apimatic, claude-code, anthropic,
claude-haiku, transformers.js, render, playwright

## Testing instructions for judges

Live demo: https://bono-h8b8.onrender.com (PayPal sandbox; the free server can take ~30 s to
wake up). Judge logins and step-by-step instructions are in the README's "For judges" section.
