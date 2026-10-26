import "./scripts/load-env.mts";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  // Supabase owns these roles; don't try to create them.
  entities: { roles: { provider: "supabase" } },
});
