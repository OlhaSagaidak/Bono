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
npm run dev            # http://localhost:3000
```

## License

MIT
