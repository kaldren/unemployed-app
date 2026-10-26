// Loads env files with `next dev`'s precedence: .env.development.local (the local database, written by
// scripts/db.mts) wins over .env.local. The first file to set a variable wins, even when it sets it empty.
import { existsSync } from "node:fs";

for (const file of [".env.development.local", ".env.local"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
