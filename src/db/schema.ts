import { sql } from "drizzle-orm";
import { pgEnum, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

export const profileType = pgEnum("profile_type", ["candidate", "employer"]);

const isOwner = sql`(select auth.uid()) = id`;

// One row per auth user, created on first sign-in. Inserts happen server-side only.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid()
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: profileType().notNull(),
    fullName: text("full_name"),
    email: text().notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [
    pgPolicy("Users can read their own profile", {
      for: "select",
      to: authenticatedRole,
      using: isOwner,
    }),
    pgPolicy("Users can update their own profile", {
      for: "update",
      to: authenticatedRole,
      using: isOwner,
      withCheck: isOwner,
    }),
  ],
).enableRLS();

export type Profile = typeof profiles.$inferSelect;
