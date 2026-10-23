import "server-only";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { roles, skills } from "@/db/schema";
import { cleanName, normalizeSlug } from "./slug";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Catalog = typeof skills | typeof roles;

// Returns the catalog id for each name, adding names the catalog doesn't have yet.
// Keys of the returned map are slugs, so "React.js" and "react" resolve to the same id.
async function ensureEntries(tx: Tx, table: Catalog, names: string[]) {
  const bySlug = new Map<string, string>();
  for (const name of names) {
    const slug = normalizeSlug(name);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, cleanName(name));
  }
  if (bySlug.size === 0) return new Map<string, string>();

  await tx
    .insert(table)
    .values([...bySlug].map(([slug, name]) => ({ slug, name })))
    .onConflictDoNothing({ target: table.slug });

  const rows = await tx
    .select({ id: table.id, slug: table.slug })
    .from(table)
    .where(inArray(table.slug, [...bySlug.keys()]));
  return new Map(rows.map((r) => [r.slug, r.id]));
}

export const ensureSkills = (tx: Tx, names: string[]) => ensureEntries(tx, skills, names);
export const ensureRoles = (tx: Tx, names: string[]) => ensureEntries(tx, roles, names);

// Names for the autocomplete lists.
export async function getCatalogNames() {
  const [skillRows, roleRows] = await Promise.all([
    db.select({ name: skills.name }).from(skills).orderBy(asc(skills.name)),
    db.select({ name: roles.name }).from(roles).orderBy(asc(roles.name)),
  ]);
  return { skills: skillRows.map((r) => r.name), roles: roleRows.map((r) => r.name) };
}

export type { Tx };
