import type { BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Google blocks automated logins, so signed-in tests use a dedicated email user
// whose session is minted with the admin API and written into the browser as cookies.
export const TEST_USER = {
  email: "e2e-candidate@example.com",
  fullName: "E2E Candidate",
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasServiceRoleKey = Boolean(serviceRoleKey);

export function admin() {
  return createClient(url, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getOrCreateUserId(): Promise<string> {
  const supabase = admin();
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_USER.email,
    email_confirm: true,
    user_metadata: { full_name: TEST_USER.fullName },
  });
  if (data.user) return data.user.id;
  if (error?.code !== "email_exists") throw error;

  // listUsers is paginated; walk the pages until the test user turns up.
  for (let page = 1; ; page++) {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) throw listError;
    const user = list.users.find((u) => u.email === TEST_USER.email);
    if (user) return user.id;
    if (list.users.length < 1000) throw new Error(`Test user ${TEST_USER.email} not found`);
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

// Signs the test user into the browser context. Returns the user id.
export async function signIn(context: BrowserContext, { withProfile = true } = {}) {
  const userId = await getOrCreateUserId();
  await setProfile(userId, withProfile);

  const { data: link, error: linkError } = await admin().auth.admin.generateLink({
    type: "magiclink",
    email: TEST_USER.email,
  });
  if (linkError) throw linkError;

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
    token_hash: link.properties.hashed_token,
  });
  if (error) throw error;

  await context.addCookies(
    cookies.map((c) => ({ ...c, domain: "localhost", path: "/", sameSite: "Lax" as const })),
  );
  return userId;
}
