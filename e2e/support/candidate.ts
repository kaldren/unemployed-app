import { admin } from "./test-user";

const CANDIDATE_TABLES = [
  "candidate_profiles",
  "experiences",
  "educations",
  "certifications",
  "candidate_languages",
  "candidate_skills",
  "candidate_roles",
] as const;

// Removes everything the test user added to their candidate profile.
export async function resetCandidate(userId: string) {
  const supabase = admin();
  for (const table of CANDIDATE_TABLES) {
    const { error } = await supabase.from(table).delete().eq("profile_id", userId);
    if (error) throw error;
  }
}

// Gives the test user a profile complete enough to skip the /profile redirect.
export async function seedCompleteCandidate(userId: string) {
  await resetCandidate(userId);
  const supabase = admin();
  const check = <T extends { error: unknown }>(r: T) => {
    if (r.error) throw r.error;
    return r;
  };

  check(
    await supabase.from("candidate_profiles").insert({
      profile_id: userId,
      headline: "Backend engineer",
      about: "I build reliable APIs.",
      location_country: "BG",
      work_modes: ["remote"],
      no_experience: true,
    }),
  );
  const { data: skills } = check(
    await supabase.from("skills").select("id").in("slug", ["typescript", "postgresql", "docker"]),
  );
  check(await supabase.from("candidate_skills").insert(skills!.map((s) => ({ profile_id: userId, skill_id: s.id }))));
  const { data: role } = check(await supabase.from("roles").select("id").eq("slug", "backend-engineer").single());
  check(await supabase.from("candidate_roles").insert({ profile_id: userId, role_id: role!.id }));
}
