# Bono

A social media web app where **nonprofits are the influencers**. Scroll a feed of nonprofit posts guilt free, then follow, like and donate with PayPal. Built for the PayPal AI Hackathon.

> Work in progress. Full pitch, demo link and architecture coming soon.

## Local setup (macOS)

Requirements: Node 24, Homebrew.

```bash
# Postgres 17 + pgvector
brew install postgresql@17 pgvector
brew services start postgresql@17
/opt/homebrew/opt/postgresql@17/bin/createdb bono

# App
cp .env.example .env   # then fill in your own sandbox values
npm install
npm run db:migrate     # creates tables and enables pgvector
cp seed.example.json seed.local.json   # then add your sandbox Business emails
npm run seed           # demo nonprofits, sponsors, supporters and posts
npm run dev            # http://localhost:3000
```

### Demo data

`npm run seed` creates 6 fictional nonprofits, 2 fictional sponsors, 20 supporters
and 30 posts (some in Spanish and Ukrainian). Every organization and person in
it is invented. Five nonprofits start verified with fictional EINs from a clearly
labeled demo registry (prefix `00`, which the IRS never assigns); **Canvas Commons
starts unverified**, so the verification flow can be shown from the beginning.

Demo accounts log in with emails on the reserved `bono.example` domain (e.g.
`paws-haven@bono.example`, `acme@bono.example`, `maya.chen@bono.example`) and the
`demoPassword` from your `seed.local.json`.

Re-running the seed updates the demo accounts in place and **keeps their sandbox
history** (donations, verification fees). `npm run seed -- --reset` deletes the
demo accounts and everything they did, for a clean start. Accounts on any other
domain are never touched.

### IRS data (optional)

`npm run irs:load -- wa` loads Washington's tax-exempt 501(c)(3) organizations
from the IRS Exempt Organizations Business Master File (public data from irs.gov),
so real nonprofits can pass the EIN check too. Other states: pass their two-letter
codes. The data is downloaded at load time and never committed.

## How the AI feed works

Everything except two short text jobs runs inside the app, with no paid AI service.

1. **Embeddings.** Each post (its text plus its cause tags) becomes a 384-number
   vector that captures its meaning, using the open-source `all-MiniLM-L6-v2`
   model running in the app ([transformers.js](https://huggingface.co/docs/transformers.js)).
   Vectors live in Postgres with pgvector. Non-English posts are embedded through
   their English translation, because the model reads English.
2. **Interests.** A new supporter starts at the average of the causes they picked.
   After that, their vector is recomputed from what they do:
   `normalize(1.0 × chosen causes + Σ weight × recency × engaged posts)`, with
   donate 1.0 > follow 0.6 > like 0.4 > long look (8 s+ on screen, measured in the
   browser) 0.2, and recency halving every 30 days
   ([`src/lib/feed/learn.ts`](src/lib/feed/learn.ts)).
3. **Ranking.** Every recent post gets
   `1.00 × relevance + 0.35 × freshness + 0.20 × followed + 0.15 × popularity + 0.08 × exploration`,
   where relevance is the cosine similarity between the person's vector and the
   post's; posts seen in the last 3 days move below "You're all caught up"
   ([`src/lib/feed/rank.ts`](src/lib/feed/rank.ts)).
4. **Claude Haiku** translates posts on request and turns the real ranking reasons
   into a one-line "Why am I seeing this?". Every result is cached, so the same
   input never reaches the API twice ([`src/lib/ai/claude.ts`](src/lib/ai/claude.ts)).

## License

MIT
