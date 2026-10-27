import "server-only";
import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/db";
import { companies, companyMembers, profiles, type Company, type CompanyRole, type Profile } from "@/db/schema";
import { LOGIN_PATH, NEW_COMPANY_PATH } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = Pick<Profile, "id" | "defaultView" | "fullName" | "email" | "avatarUrl">;

// The signed-in user's id, or null for a visitor. For public pages that look different when signed in.
export async function getSessionUserId(): Promise<string | null> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

// Verifies the session and returns the signed-in user's profile.
// Redirects to /login when signed out. Call it from every protected page or action.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  // Supabase checks token expiry with Date.now(), so this must run at request time, not in a prerender.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(LOGIN_PATH);

  const [profile] = await db
    .select({
      id: profiles.id,
      defaultView: profiles.defaultView,
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

export type CurrentEmployer = CurrentUser & {
  company: Pick<Company, "id" | "name" | "domain" | "status" | "verifiedAt">;
  role: CompanyRole;
};

// The company a user hires for: their oldest membership (the app shows one company per user).
export async function getMembership(userId: string) {
  const [membership] = await db
    .select({
      role: companyMembers.role,
      company: {
        id: companies.id,
        name: companies.name,
        domain: companies.domain,
        status: companies.status,
        verifiedAt: companies.verifiedAt,
      },
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(eq(companyMembers.profileId, userId))
    .orderBy(asc(companyMembers.createdAt))
    .limit(1);
  return membership ?? null;
}

// getCurrentUser for hiring pages and actions, with the user's company. Hiring rights come from company
// membership, not the account: a user without a company goes to create one (or accept an invite).
export const requireEmployer = cache(async (): Promise<CurrentEmployer> => {
  const user = await getCurrentUser();
  const membership = await getMembership(user.id);
  if (!membership) redirect(NEW_COMPANY_PATH);
  return { ...user, ...membership };
});

// Candidates see a company's jobs once it has proved its domain and passed vetting.
export const canHire = (company: Pick<Company, "status" | "verifiedAt">) =>
  company.status === "approved" && company.verifiedAt !== null;

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
