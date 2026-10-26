import "server-only";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/db";
import { companies, companyMembers, profiles, type Company, type Profile } from "@/db/schema";
import { HOME_PATH } from "@/lib/portal";
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

// getCurrentUser for candidate-only pages and actions; anyone else goes home.
export async function requireCandidate(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user.type !== "candidate") redirect(HOME_PATH[user.type]);
  return user;
}

export type CurrentEmployer = CurrentUser & {
  company: Pick<Company, "id" | "name" | "domain" | "status">;
  role: "owner" | "member";
};

// getCurrentUser for employer-only pages and actions, with the employer's company; anyone else goes home.
export const requireEmployer = cache(async (): Promise<CurrentEmployer> => {
  const user = await getCurrentUser();
  if (user.type !== "employer") redirect("/");

  const [membership] = await db
    .select({
      role: companyMembers.role,
      company: { id: companies.id, name: companies.name, domain: companies.domain, status: companies.status },
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(eq(companyMembers.profileId, user.id));

  // Created in the same transaction as the profile, so this is only a safety net.
  if (!membership) redirect("/auth/signout?portal=employer");

  return { ...user, ...membership };
});

// Admins are listed by user id in ADMIN_USER_IDS (comma-separated).
export function isAdmin(userId: string) {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .includes(userId);
}

// getCurrentUser for admin-only pages and actions. Anyone else gets a 404, so the page stays unlisted.
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!isAdmin(user.id)) notFound();
  return user;
}

// Only allow same-origin relative paths, so `next` can't become an open redirect.
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
