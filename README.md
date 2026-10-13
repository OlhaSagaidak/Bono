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
