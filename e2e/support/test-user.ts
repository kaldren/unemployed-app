import type { BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "../../src/lib/env";

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

export async function getOrCreateUserId({ email, fullName }: { email: string; fullName: string } = TEST_USER) {
  const supabase = admin();
  const { data, error } = await supabase.auth.admin.createUser({
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

export async function setProfile(userId: string, exists: boolean) {
  const supabase = admin();
  const { error } = exists
    ? await supabase.from("profiles").upsert({
        id: userId,
        type: "candidate",
        email: TEST_USER.email,
        full_name: TEST_USER.fullName,
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

// Signs the test user into the browser context. Returns the user id.
export async function signIn(context: BrowserContext, { withProfile = true } = {}) {
  const userId = await getOrCreateUserId();
  await setProfile(userId, withProfile);

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
    token_hash: await magicLinkTokenHash(TEST_USER.email),
  });
  if (error) throw error;

  await context.addCookies(
    cookies.map((c) => ({ ...c, domain: "localhost", path: "/", sameSite: "Lax" as const })),
  );
  return userId;
}
