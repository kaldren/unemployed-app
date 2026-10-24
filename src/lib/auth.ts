import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/db";
import { profiles, type Profile } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = Pick<Profile, "id" | "type" | "fullName" | "email" | "avatarUrl">;

// Verifies the session and returns the signed-in user's profile.
// Redirects to /login when signed out. Call it from every protected page or action.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  // Supabase checks token expiry with Date.now(), so this must run at request time, not in a prerender.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const [profile] = await db
    .select({
      id: profiles.id,
      type: profiles.type,
      fullName: profiles.fullName,
      email: profiles.email,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, userId));

  // Profiles are created in /auth/callback. A session without one (e.g. left over from
  // before the profile existed) can't be used, so clear it and ask the user to sign in again.
  if (!profile) redirect("/auth/signout");

  return profile;
});

// Only allow same-origin relative paths, so `next` can't become an open redirect.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
