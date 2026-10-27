import type { BrowserContext, Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "../../src/lib/env";
import { splitFullName } from "../../src/lib/name";

// Google blocks automated logins, so signed-in tests use a dedicated email user
// whose session is minted with the admin API and written into the browser as cookies.
export const TEST_USER = {
  email: "e2e-candidate@example.com",
  fullName: "E2E Candidate",
};

const { url, anonKey } = supabaseEnv();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasServiceRoleKey = Boolean(serviceRoleKey);

export function admin() {
  return createClient(url, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type TestUser = { email: string; fullName: string; id?: string };

export async function getOrCreateUserId({ email, fullName, id }: TestUser = TEST_USER) {
  const supabase = admin();
  const { data, error } = await supabase.auth.admin.createUser({
    id,
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (data.user) return data.user.id;
  if (error?.code !== "email_exists") throw error;

  // listUsers is paginated; walk the pages until the test user turns up.
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page, perPage });
    if (listError) throw listError;
    const user = list.users.find((u) => u.email === email);
    if (user) return user.id;
    if (list.users.length < perPage) throw new Error(`Test user ${email} not found`);
  }
}

export async function setProfile(userId: string, exists: boolean, user: TestUser = TEST_USER) {
  const supabase = admin();
  const { error } = exists
    ? await supabase.from("profiles").upsert({
        id: userId,
        default_view: "candidate",
        email: user.email,
        first_name: splitFullName(user.fullName).firstName,
        last_name: splitFullName(user.fullName).lastName,
        full_name: user.fullName,
      })
    : await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw error;
}

// A one-time token for a magic link to `email`, as /auth/callback?token_hash=… accepts it.
export async function magicLinkTokenHash(email: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  return data.properties.hashed_token;
}

// Signs the test user (or `user`) into the browser context as a candidate. Returns the user id.
export async function signIn(context: BrowserContext, { withProfile = true, user = TEST_USER } = {}) {
  const userId = await getOrCreateUserId(user);
  await setProfile(userId, withProfile, user);

  // Let @supabase/ssr write the session, so the cookies match what the app expects.
  const cookies: { name: string; value: string }[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (toSet) => {
        for (const { name, value } of toSet) {
          const i = cookies.findIndex((c) => c.name === name);
          if (i >= 0) cookies.splice(i, 1);
          if (value) cookies.push({ name, value });
        }
      },
    },
  });
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: await magicLinkTokenHash(user.email),
  });
  if (error) throw error;

  await context.addCookies(
    cookies.map((c) => ({ ...c, domain: "localhost", path: "/", sameSite: "Lax" as const })),
  );
  return userId;
}

// Signs out from the header's account menu.
export async function signOutFromMenu(page: Page) {
  await page.getByRole("button", { name: /^Account:/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
}
