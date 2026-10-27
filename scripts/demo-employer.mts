// Creates (or refreshes) a demo employer with an approved company, and prints a one-time sign-in link.
// Usage: pnpm demo:employer [base url, default http://localhost:3000]
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local. The link works once and expires after an hour; rerun for a new one.
import "./load-env.mts";
import { createClient } from "@supabase/supabase-js";

const DEMO = { email: "demo@acme-demo.test", fullName: "Demo Employer" };
const COMPANY = { domain: "acme-demo.test", name: "Acme Demo" };

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } = process.env;
if (!url || !serviceRoleKey) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const check = <T extends { error: unknown }>(result: T) => {
  if (result.error) throw result.error;
  return result;
};

const created = await supabase.auth.admin.createUser({
  email: DEMO.email,
  email_confirm: true,
  user_metadata: { full_name: DEMO.fullName },
});
if (created.error && created.error.code !== "email_exists") throw created.error;

// The link also tells us the user's id, whether they were just created or already existed.
const { data: link } = check(await supabase.auth.admin.generateLink({ type: "magiclink", email: DEMO.email }));
const { user, properties } = link as { user: { id: string }; properties: { hashed_token: string } };
const userId = user.id;

check(
  await supabase.from("profiles").upsert({ id: userId, type: "employer", email: DEMO.email, full_name: DEMO.fullName }),
);
// Domains are unique only once verified, so find the demo company before creating it.
const { data: existing } = check(await supabase.from("companies").select("id").eq("domain", COMPANY.domain).maybeSingle());
const values = { ...COMPANY, status: "approved", verified_at: new Date().toISOString() };
const { data: company } = check(
  existing
    ? await supabase.from("companies").update(values).eq("id", (existing as { id: string }).id).select("id").single()
    : await supabase.from("companies").insert(values).select("id").single(),
);
check(
  await supabase
    .from("company_members")
    .upsert({ profile_id: userId, company_id: (company as { id: string }).id, role: "owner" }, { onConflict: "company_id,profile_id" }),
);

const signIn = new URL("/auth/callback", process.argv[2] ?? "http://localhost:3000");
signIn.searchParams.set("portal", "employer");
signIn.searchParams.set("type", "magiclink");
signIn.searchParams.set("token_hash", properties.hashed_token);
console.log(`${DEMO.email} owns ${COMPANY.name} (approved). Open this link to sign in:\n${signIn}`);
