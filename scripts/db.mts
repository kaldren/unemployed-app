// Picks the database the app runs against: a local Supabase stack in OrbStack (the default), or the
// hosted project from .env.local.
//   node scripts/db.mts               Makes the chosen database ready (run by `pnpm dev` and `pnpm test:e2e`).
//   node scripts/db.mts use remote    Switch to the hosted project; `use local` switches back.
// Local mode starts OrbStack and `supabase start` when needed, applies the Drizzle migrations and writes
// .env.development.local, which overrides .env.local's Supabase settings in dev, scripts and e2e.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { SEED_ADMIN } from "../src/lib/seed/fixtures.ts";

const TARGET_FILE = ".db-target";
const LOCAL_ENV_FILE = ".env.development.local";
type Target = "local" | "remote";

const run = (cmd: string, args: string[]) => {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`\`${cmd} ${args.join(" ")}\` failed`);
};
const succeeds = (cmd: string, args: string[]) => spawnSync(cmd, args, { stdio: "ignore" }).status === 0;

function readTarget(): Target {
  return existsSync(TARGET_FILE) && readFileSync(TARGET_FILE, "utf8").trim() === "remote" ? "remote" : "local";
}

function switchToLocal() {
  // Already running (on OrbStack or any other Docker engine): nothing to start.
  if (!succeeds("supabase", ["status"])) {
    if (!succeeds("docker", ["info"])) {
      console.log("Starting OrbStack…");
      run("orb", ["start"]);
    }
    console.log("Starting local Supabase (first run downloads the images)…");
    run("supabase", ["start"]);
  }
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })) as Record<
    string,
    string
  >;
  const env = [
    "# Written by scripts/db.mts for the local Supabase stack; `pnpm db:use remote` removes it.",
    "# Overrides .env.local. The keys are Supabase's public local-development defaults.",
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
    `DATABASE_URL=${status.DB_URL}`,
    "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
    "# The seeded admin (see the seed report) can open /admin.",
    `ADMIN_USER_IDS=${SEED_ADMIN.id}`,
    "# No real mail from local data. Auth emails (magic links) land in Mailpit:",
    `# ${status.MAILPIT_URL ?? status.INBUCKET_URL}`,
    "RESEND_API_KEY=",
    "",
  ].join("\n");
  // Rewriting an unchanged file would make a running `next dev` reload its env.
  if (!existsSync(LOCAL_ENV_FILE) || readFileSync(LOCAL_ENV_FILE, "utf8") !== env) writeFileSync(LOCAL_ENV_FILE, env);
  // Quiet unless it fails: drizzle-kit prints a NOTICE for every migration already applied.
  const migrate = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], { encoding: "utf8" });
  if (migrate.status !== 0) {
    console.error(migrate.stdout, migrate.stderr);
    throw new Error("Migrating the local database failed");
  }
  console.log(`Using the local database. Studio: ${status.STUDIO_URL}. Switch with \`pnpm db:use remote\`.`);
}

function switchToRemote() {
  rmSync(LOCAL_ENV_FILE, { force: true });
  console.log("Using the hosted Supabase project from .env.local. Switch back with `pnpm db:use local`.");
}

const [command, arg] = process.argv.slice(2);
try {
  if (command === "use") {
    if (arg !== "local" && arg !== "remote") throw new Error("Usage: pnpm db:use local|remote");
    writeFileSync(TARGET_FILE, `${arg}\n`);
  } else if (command) {
    throw new Error(`Unknown command ${command}`);
  }
  if (readTarget() === "local") switchToLocal();
  else switchToRemote();
} catch (error) {
  console.error(`\n⚠ ${error instanceof Error ? error.message : error}`);
  console.error("Needs OrbStack and the Supabase CLI (brew install orbstack supabase/tap/supabase).");
  console.error("Or run against the hosted project: pnpm db:use remote\n");
  process.exit(1);
}
