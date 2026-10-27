// Wipes every seeded row and creates the fixtures afresh, through the Supabase admin API.
// Used by `scripts/seed.mts` (on every `pnpm dev`) and the seed e2e test. Never touches non-seed rows.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSlug } from "../candidate/slug.ts";
import { isSeedEmail, SEED_DOMAIN } from "./domain.ts";
import { CANDIDATES, COMPANIES, SEED_ADMIN, SEED_ROLES, SEED_SKILLS, seedMatches, SWIPES } from "./fixtures.ts";

export type SeedAccount = {
  portal: "candidate" | "employer" | "admin";
  email: string;
  fullName: string;
  // Headline for candidates; company, role and status for employers.
  detail: string;
  signInUrl: string;
};

const CURRENCY = "EUR";

function check<T extends { error: unknown }>(result: T) {
  if (result.error) throw result.error;
  return result;
}

async function deleteSeedUsers(supabase: SupabaseClient) {
  const perPage = 1000;
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data } = check(await supabase.auth.admin.listUsers({ page, perPage }));
    ids.push(...data.users.filter((u) => u.email && isSeedEmail(u.email)).map((u) => u.id));
    if (data.users.length < perPage) break;
  }
  // Profiles and everything under them cascade from the auth user.
  for (const { error } of await Promise.all(ids.map((id) => supabase.auth.admin.deleteUser(id)))) {
    if (error) throw error;
  }
  // Jobs, members, swipes and matches cascade from the company.
  check(await supabase.from("companies").delete().or(`domain.eq.${SEED_DOMAIN},domain.like.*.${SEED_DOMAIN}`));
}

// Catalog ids by slug, adding seed skills and roles the catalog doesn't have yet.
async function catalogIds(supabase: SupabaseClient, table: "skills" | "roles", names: string[]) {
  const rows = names.map((name) => ({ name, slug: normalizeSlug(name) }));
  check(await supabase.from(table).upsert(rows, { onConflict: "slug", ignoreDuplicates: true }));
  const { data } = check(await supabase.from(table).select("id, slug").in("slug", rows.map((r) => r.slug)));
  const bySlug = new Map((data as { id: string; slug: string }[]).map((r) => [r.slug, r.id]));
  return (name: string) => bySlug.get(normalizeSlug(name))!;
}

async function createUser(
  supabase: SupabaseClient,
  email: string,
  fullName: string,
  defaultView: "candidate" | "employer",
  id?: string,
) {
  const { data } = check(
    await supabase.auth.admin.createUser({ id, email, email_confirm: true, user_metadata: { full_name: fullName } }),
  );
  const userId = data.user!.id;
  check(await supabase.from("profiles").insert({ id: userId, default_view: defaultView, email, full_name: fullName }));
  return userId;
}

// A one-time link that signs the user in through the app's own callback, like the magic-link email does.
async function signInUrl(supabase: SupabaseClient, baseUrl: string, email: string, portal: SeedAccount["portal"]) {
  const { data } = check(await supabase.auth.admin.generateLink({ type: "magiclink", email }));
  const url = new URL("/auth/callback", baseUrl);
  if (portal === "admin") url.searchParams.set("next", "/admin");
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("token_hash", data.properties!.hashed_token);
  return url.toString();
}

// `withAdmin` also creates SEED_ADMIN; pass it only where ADMIN_USER_IDS lists that id.
export async function runSeed({
  url,
  serviceRoleKey,
  baseUrl,
  withAdmin = false,
}: {
  url: string;
  serviceRoleKey: string;
  baseUrl: string;
  withAdmin?: boolean;
}) {
  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await deleteSeedUsers(supabase);

  const [skillId, roleId] = await Promise.all([
    catalogIds(supabase, "skills", SEED_SKILLS),
    catalogIds(supabase, "roles", SEED_ROLES),
  ]);
  // A stamp that never goes stale, so opening a deck never starts a real (paid) AI matching run,
  // however long the dev server runs. Editing a seeded profile or job still rescores it.
  const matchedAt = "9999-01-01T00:00:00Z";
  const vettedAt = new Date().toISOString();

  const candidateIds = new Map<string, string>();
  await Promise.all(
    CANDIDATES.map(async (c) => {
      const id = await createUser(supabase, c.email, c.fullName, "candidate");
      candidateIds.set(c.key, id);
      check(
        await supabase.from("candidate_profiles").insert({
          profile_id: id,
          headline: c.headline,
          about: c.about,
          location_city: c.locationCity,
          location_country: c.locationCountry,
          open_to_relocation: c.openToRelocation ?? false,
          job_search_status: "actively_looking",
          available_from: "1_month",
          seniority: c.seniority,
          work_modes: c.workModes,
          salary_min: c.salaryMin ?? null,
          salary_currency: c.salaryMin ? CURRENCY : null,
          no_experience: c.experiences.length === 0,
          matched_at: matchedAt,
          // Seed addresses can't receive mail.
          email_digest: false,
        }),
      );
      const inserts = [
        supabase.from("candidate_skills").insert(c.skills.map((s) => ({ profile_id: id, skill_id: skillId(s) }))),
        supabase.from("candidate_roles").insert({ profile_id: id, role_id: roleId(c.role) }),
        supabase
          .from("candidate_languages")
          .insert(c.languages.map((l) => ({ profile_id: id, language_code: l.code, proficiency: l.proficiency }))),
      ];
      if (c.experiences.length) {
        inserts.push(
          supabase.from("experiences").insert(
            c.experiences.map((e) => ({
              profile_id: id,
              company_name: e.companyName,
              title: e.title,
              start_date: e.startDate,
              end_date: e.endDate ?? null,
              description: e.description,
            })),
          ),
        );
      }
      if (c.education) {
        const { institution, degree, fieldOfStudy, startYear, endYear } = c.education;
        inserts.push(
          supabase.from("educations").insert({
            profile_id: id,
            institution,
            degree,
            field_of_study: fieldOfStudy,
            start_year: startYear,
            end_year: endYear,
          }),
        );
      }
      for (const result of await Promise.all(inserts)) check(result);
    }),
  );

  if (withAdmin) await createUser(supabase, SEED_ADMIN.email, SEED_ADMIN.fullName, "candidate", SEED_ADMIN.id);

  const jobIds = new Map<string, string>();
  const jobCompany = new Map<string, string>();
  const ownerIds = new Map<string, string>();
  await Promise.all(
    COMPANIES.map(async (company) => {
      const { data } = check(
        await supabase
          .from("companies")
          .insert({
            domain: company.domain,
            name: company.name,
            status: company.status,
            verified_at: vettedAt,
            vetting_reason: company.vettingReason,
            vetting_model: "seed",
            vetted_at: vettedAt,
          })
          .select("id")
          .single(),
      );
      const companyId = (data as { id: string }).id;
      const employerIds = await Promise.all(
        company.employers.map(async (e) => {
          const id = await createUser(supabase, e.email, e.fullName, "employer");
          check(await supabase.from("company_members").insert({ profile_id: id, company_id: companyId, role: e.role }));
          return id;
        }),
      );
      const ownerId = employerIds[company.employers.findIndex((e) => e.role === "owner")]!;
      ownerIds.set(company.domain, ownerId);
      await Promise.all(
        company.jobs.map(async (job) => {
          const { data: row } = check(
            await supabase
              .from("jobs")
              .insert({
                company_id: companyId,
                created_by: ownerId,
                title: job.title,
                description: job.description,
                seniority: job.seniority,
                employment_type: job.employmentType,
                work_mode: job.workMode,
                location_city: job.locationCity ?? null,
                location_country: job.locationCountry ?? null,
                salary_min: job.salaryMin,
                salary_max: job.salaryMax,
                salary_currency: CURRENCY,
                status: job.status,
                matched_at: matchedAt,
              })
              .select("id")
              .single(),
          );
          const jobId = (row as { id: string }).id;
          jobIds.set(job.key, jobId);
          jobCompany.set(job.key, company.domain);
          check(
            await supabase
              .from("job_skills")
              .insert(job.skills.map((s, position) => ({ job_id: jobId, skill_id: skillId(s), position }))),
          );
        }),
      );
    }),
  );

  const matches = seedMatches();
  check(
    await supabase.from("job_matches").insert(
      matches.map((m) => ({
        job_id: jobIds.get(m.jobKey),
        candidate_id: candidateIds.get(m.candidateKey),
        score: m.score,
        skill_coverage: m.skillCoverage,
        matched_skills: m.matchedSkills,
        candidate_reason: m.candidateReason,
        employer_reason: m.employerReason,
        model: "seed",
        input_hash: "seed",
      })),
    ),
  );
  check(
    await supabase.from("candidate_swipes").insert(
      SWIPES.candidate.map((s) => ({
        profile_id: candidateIds.get(s.candidateKey),
        job_id: jobIds.get(s.jobKey),
        liked: s.liked,
      })),
    ),
  );
  check(
    await supabase.from("employer_swipes").insert(
      SWIPES.employer.map((s) => ({
        job_id: jobIds.get(s.jobKey),
        candidate_id: candidateIds.get(s.candidateKey),
        decided_by: ownerIds.get(jobCompany.get(s.jobKey)!),
        liked: s.liked,
      })),
    ),
  );

  const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
  const matchCount = (key: string) => matches.filter((m) => m.candidateKey === key).length;
  return Promise.all([
    ...(withAdmin
      ? [
          (async () => ({
            portal: "admin" as const,
            email: SEED_ADMIN.email,
            fullName: SEED_ADMIN.fullName,
            detail: "can approve or reject companies at /admin",
            signInUrl: await signInUrl(supabase, baseUrl, SEED_ADMIN.email, "admin"),
          }))(),
        ]
      : []),
    ...CANDIDATES.map(async (c) => ({
      portal: "candidate" as const,
      email: c.email,
      fullName: c.fullName,
      detail: `${c.headline}, ${count(matchCount(c.key), "matched job")}`,
      signInUrl: await signInUrl(supabase, baseUrl, c.email, "candidate"),
    })),
    ...COMPANIES.flatMap((company) =>
      company.employers.map(async (e) => ({
        portal: "employer" as const,
        email: e.email,
        fullName: e.fullName,
        detail: `${e.role} of ${company.name} (${company.status.replace("_", " ")}), ${count(company.jobs.length, "job")}`,
        signInUrl: await signInUrl(supabase, baseUrl, e.email, "employer"),
      })),
    ),
  ]) satisfies Promise<SeedAccount[]>;
}
