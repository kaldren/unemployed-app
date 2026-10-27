import "server-only";
import type { User } from "@supabase/supabase-js";
import { db } from "@/db";
import { profiles } from "@/db/schema";

// Every sign-in method (Google, password, an email link) makes the same kind of account. The first
// sign-in creates the profile; later ones leave it as is. Supabase links identities with the same
// verified email, so one email is one user however they sign in.
export async function ensureProfile(user: User) {
  if (!user.email) throw new Error(`User ${user.id} has no email`);
  const meta = user.user_metadata;
  await db
    .insert(profiles)
    .values({
      id: user.id,
      email: user.email,
      fullName: meta.full_name ?? meta.name ?? null,
      avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    })
    .onConflictDoNothing({ target: profiles.id });
}
