import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

// The Supabase pooler runs in transaction mode in production, which doesn't support prepared statements.
const client = postgres(databaseUrl(process.env.DATABASE_URL!), { prepare: false });

export const db = drizzle(client, { schema, casing: "snake_case" });
