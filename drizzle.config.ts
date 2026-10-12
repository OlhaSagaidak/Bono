import { defineConfig } from "drizzle-kit";

// Locally the URL comes from .env; on Render it is set in the environment.
try {
  process.loadEnvFile();
} catch {}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
});
