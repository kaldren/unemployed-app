import type { CandidateProfileData } from "./queries";

export const MIN_SKILLS = 3;

export type ProfileSection = "about" | "preferences" | "experience" | "skills";

type Requirement = {
  section: ProfileSection;
  met: (data: CandidateProfileData) => boolean;
};

// What a candidate needs before they can be matched. Order is the order shown on /profile.
const REQUIREMENTS: Requirement[] = [
  { section: "about", met: ({ profile }) => Boolean(profile?.headline) },
  { section: "about", met: ({ profile }) => Boolean(profile?.about) },
  { section: "about", met: ({ profile }) => Boolean(profile?.locationCountry) },
  { section: "preferences", met: ({ roles }) => roles.length > 0 },
  { section: "preferences", met: ({ profile }) => Boolean(profile?.workModes.length) },
  { section: "experience", met: ({ profile, experiences }) => experiences.length > 0 || Boolean(profile?.noExperience) },
  { section: "skills", met: ({ skills }) => skills.length >= MIN_SKILLS },
];

export const COMPLETENESS_STEPS = REQUIREMENTS.length;

// The unmet requirements; each names the profile section that fixes it.
export function getMissingItems(data: CandidateProfileData): Pick<Requirement, "section">[] {
  return REQUIREMENTS.filter((r) => !r.met(data)).map(({ section }) => ({ section }));
}
