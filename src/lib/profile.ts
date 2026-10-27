import "server-only";
import type { User } from "@supabase/supabase-js";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { splitFullName } from "@/lib/name";

// Every sign-in method (Google, password, an email link) makes the same kind of account. The first
// sign-in creates the profile; later ones leave it as is. Supabase links identities with the same
// verified email, so one email is one user however they sign in.
export async function ensureProfile(user: User) {
  if (!user.email) throw new Error(`User ${user.id} has no email`);
  const meta = user.user_metadata;
  const fullName: string | null = meta.full_name ?? meta.name ?? null;
  // Email sign-up sends first_name/last_name; Google sends given_name/family_name.
  // Structured parts come as a pair; mixing one with half of full_name could repeat a word.
  const structured = meta.first_name || meta.given_name;
  const split = structured
    ? { firstName: meta.first_name ?? meta.given_name, lastName: meta.last_name ?? meta.family_name ?? null }
    : splitFullName(fullName);
  await db
    .insert(profiles)
    .values({
      id: user.id,
      email: user.email,
      firstName: split.firstName,
      lastName: split.lastName,
      fullName,
      avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    })
    .onConflictDoNothing({ target: profiles.id });
}
