import type { Page } from "@playwright/test";
import { admin, getOrCreateUserId, magicLinkTokenHash } from "./test-user";

export const EMPLOYER_DOMAIN = "example.com";
export const EMPLOYER_COMPANY = "Example";
export const OWNER = { email: `e2e-employer@${EMPLOYER_DOMAIN}`, fullName: "E2E Employer" };
export const TEAMMATE = { email: `e2e-teammate@${EMPLOYER_DOMAIN}`, fullName: "E2E Teammate" };

// Deletes the test company and the employers' profiles, so the next sign-in starts fresh.
export async function resetEmployers() {
  const supabase = admin();
  const ids = await Promise.all([OWNER, TEAMMATE].map((user) => getOrCreateUserId(user)));
  const { error: companyError } = await supabase.from("companies").delete().eq("domain", EMPLOYER_DOMAIN);
  if (companyError) throw companyError;
  const { error } = await supabase.from("profiles").delete().in("id", ids);
  if (error) throw error;
  return ids;
}

// Opens a magic link the way the email would, through the employer callback.
export async function openEmployerMagicLink(page: Page, email: string) {
  const tokenHash = await magicLinkTokenHash(email);
  await page.goto(`/auth/callback?portal=employer&type=magiclink&token_hash=${tokenHash}`);
}

export async function membership(userId: string) {
  const { data, error } = await admin()
    .from("company_members")
    .select("role, companies(domain, name, status)")
    .eq("profile_id", userId)
    .single();
  if (error) throw error;
  return data;
}
