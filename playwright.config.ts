import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { E2E_ADMIN } from "./e2e/support/admin-user";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
// The dev server inherits this, so the e2e admin can open /admin.
process.env.ADMIN_USER_IDS = [process.env.ADMIN_USER_IDS, E2E_ADMIN.id].filter(Boolean).join(",");

// Its own port and build folder, so e2e never reuses the dev server you run on :3000 (it lacks the e2e admin above).
const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  // Tests share one Supabase test user, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm next dev --port ${port}`,
    env: { NEXT_DIST_DIR: ".next-e2e" },
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
