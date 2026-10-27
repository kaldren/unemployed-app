import type { Page } from "@playwright/test";
import { admin, getOrCreateUserId, magicLinkTokenHash } from "./test-user";

export const EMPLOYER_DOMAIN = "example.com";
export const EMPLOYER_COMPANY = "Example";
export const OWNER = { email: `e2e-employer@${EMPLOYER_DOMAIN}`, fullName: "E2E Employer" };
export const TEAMMATE = { email: `e2e-teammate@${EMPLOYER_DOMAIN}`, fullName: "E2E Teammate" };

const check = <T extends { error: unknown }>(result: T) => {
  if (result.error) throw result.error;
  return result;
};

// Deletes the test company and the employers' profiles. By default it then gives OWNER a fresh,
// verified (not yet vetted) company, as most specs need; `withCompany: false` leaves them without one.
export async function resetEmployers({ withCompany = true, verified = true } = {}) {
  const supabase = admin();
  const ids = await Promise.all([OWNER, TEAMMATE].map((user) => getOrCreateUserId(user)));
  check(await supabase.from("companies").delete().eq("domain", EMPLOYER_DOMAIN));
  check(await supabase.from("profiles").delete().in("id", ids));
  if (withCompany) await createCompany(ids[0]!, verified);
  return ids;
}

async function createEmployerProfile(id: string, user: typeof OWNER) {
  check(await admin().from("profiles").insert({ id, default_view: "employer", email: user.email, full_name: user.fullName }));
}

async function createCompany(ownerId: string, verified: boolean) {
  const supabase = admin();
  await createEmployerProfile(ownerId, OWNER);
  const { data } = check(
    await supabase
      .from("companies")
      .insert({ domain: EMPLOYER_DOMAIN, name: EMPLOYER_COMPANY, verified_at: verified ? new Date().toISOString() : null })
      .select("id")
      .single(),
  );
  check(await supabase.from("company_members").insert({ company_id: data!.id, profile_id: ownerId, role: "owner" }));
}

// Adds TEAMMATE to the test company as a recruiter (what accepting an invite does).
export async function addTeammate() {
  const supabase = admin();
  const id = await getOrCreateUserId(TEAMMATE);
  await createEmployerProfile(id, TEAMMATE);
  const { data } = check(await supabase.from("companies").select("id").eq("domain", EMPLOYER_DOMAIN).single());
  check(await supabase.from("company_members").insert({ company_id: data!.id, profile_id: id, role: "recruiter" }));
  return id;
}

// Opens a magic link the way the email would, through the callback, straight into the hiring view.
export async function openEmployerMagicLink(page: Page, email: string, next = "/employers") {
  const tokenHash = await magicLinkTokenHash(email);
  await page.goto(`/auth/callback?type=magiclink&token_hash=${tokenHash}&next=${encodeURIComponent(next)}`);
}

export async function membership(userId: string) {
  const { data } = check(
    await admin()
      .from("company_members")
      .select("role, companies(domain, name, status, verified_at)")
      .eq("profile_id", userId)
      .single(),
  );
  return data;
}
