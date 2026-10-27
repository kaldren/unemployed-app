import "server-only";
import type { User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import type { AuthError, Portal } from "@/lib/portal";

export function profileValues(user: User, type: Portal) {
  if (!user.email) throw new Error(`User ${user.id} has no email`);
  const meta = user.user_metadata;
  return {
    id: user.id,
    type,
    email: user.email,
    fullName: meta.full_name ?? meta.name ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
  };
}

// First sign-in on the employer page (Google, password or an email link) makes an employer profile.
// Any email may sign up; the company comes next, at /employers/company/new. A candidate account is refused.
export async function ensureEmployerProfile(user: User): Promise<AuthError | null> {
  const [existing] = await db.select({ type: profiles.type }).from(profiles).where(eq(profiles.id, user.id));
  if (existing) return existing.type === "employer" ? null : "candidate_account";
  await db.insert(profiles).values(profileValues(user, "employer")).onConflictDoNothing({ target: profiles.id });
  return null;
}
