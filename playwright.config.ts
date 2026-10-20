import { defineConfig } from "@playwright/test";

// End-to-end tests against the local app and the seeded demo data
// (`npm run seed` first). They log in with the demo password from the
// gitignored seed.local.json, and clean up after themselves.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false, // they share one database
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", viewport: { width: 1440, height: 1000 } },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
