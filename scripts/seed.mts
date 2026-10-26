// Wipes and recreates the dummy candidates, companies and jobs, then prints a sign-in link for each account.
// Runs before every `pnpm dev`; run `pnpm seed` alone for fresh links. Links work once and expire after an hour.
// Seed rows live under *.seed.test; real accounts are never touched. Seeds whichever database `pnpm db:use` picked.
// `--soft` (used by `pnpm dev`) reports a failure but exits 0, so the app still starts.
import "./load-env.mts";
import { writeFileSync } from "node:fs";
import { listsSeedAdmin } from "../src/lib/seed/fixtures.ts";
import { runSeed, type SeedAccount } from "../src/lib/seed/run.ts";

const soft = process.argv.includes("--soft");
const REPORT_FILE = ".seed-accounts.md";

function fail(message: string): never {
  console.error(`\n⚠ Seed skipped: ${message}\n`);
  process.exit(soft ? 0 : 1);
}

if (process.env.VERCEL || process.env.NODE_ENV === "production") fail("refusing to seed outside local development");
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } = process.env;
if (!url || !serviceRoleKey) fail("needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");

const baseUrl = `http://localhost:${process.env.PORT ?? 3000}`;
const started = Date.now();
let accounts: SeedAccount[];
try {
  accounts = await runSeed({ url, serviceRoleKey, baseUrl, withAdmin: listsSeedAdmin() });
} catch (error) {
  fail(error instanceof Error ? error.message : JSON.stringify(error));
}

const section = (portal: SeedAccount["portal"], title: string) => [
  `## ${title}`,
  "",
  ...accounts
    .filter((a) => a.portal === portal)
    .flatMap((a) => [`- **${a.fullName}** <${a.email}>: ${a.detail}`, `  ${a.signInUrl}`]),
  "",
];
const report = [
  `# Seed accounts (${new Date().toLocaleString()})`,
  "",
  "Each link signs in once and expires in an hour; `pnpm seed` makes new ones.",
  "Use a separate browser profile or private window per account.",
  "",
  ...(accounts.some((a) => a.portal === "admin") ? section("admin", "Admin") : []),
  ...section("candidate", "Candidates"),
  ...section("employer", "Employers"),
].join("\n");

writeFileSync(REPORT_FILE, report);
console.log(`\n${report}\nSeeded in ${((Date.now() - started) / 1000).toFixed(1)}s. Saved to ${REPORT_FILE}.\n`);
