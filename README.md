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

`npm run seed` creates 5 fictional nonprofits, 2 fictional sponsors, 20 supporters
and 30 posts (some in Spanish and Ukrainian). Every organization and person in
it is invented. Demo accounts log in with emails on the reserved `bono.example`
domain (e.g. `paws-haven@bono.example`, `acme@bono.example`,
`maya.chen@bono.example`) and the `demoPassword` from your `seed.local.json`.
Re-running the seed replaces the demo accounts and leaves every other account alone.

## License

MIT
