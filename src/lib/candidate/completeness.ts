import type { CandidateProfileData } from "./queries";

export const MIN_SKILLS = 3;

// What a candidate needs before they can be matched. Order is the order shown on /profile.
export function getMissingItems(data: CandidateProfileData): string[] {
  const p = data.profile;
  const missing: string[] = [];
  if (!p?.headline) missing.push("Headline");
  if (!p?.about) missing.push("About you");
  if (!p?.locationCountry) missing.push("Location");
  if (data.roles.length === 0) missing.push("Roles you're looking for");
  if (!p?.workModes.length) missing.push("Work mode");
  if (data.experiences.length === 0 && !p?.noExperience) missing.push("Work experience");
  if (data.skills.length < MIN_SKILLS) missing.push(`At least ${MIN_SKILLS} skills`);
  return missing;
}

export const COMPLETENESS_STEPS = 7;
