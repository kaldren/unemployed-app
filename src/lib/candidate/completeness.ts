import type { CandidateProfileData } from "./queries";

export const MIN_SKILLS = 3;

export type ProfileSection = "about" | "preferences" | "experience" | "skills";

type Requirement = {
  label: string;
  section: ProfileSection;
  met: (data: CandidateProfileData) => boolean;
};

// What a candidate needs before they can be matched. Order is the order shown on /profile.
const REQUIREMENTS: Requirement[] = [
  { label: "Headline", section: "about", met: ({ profile }) => Boolean(profile?.headline) },
  { label: "About you", section: "about", met: ({ profile }) => Boolean(profile?.about) },
  { label: "Location", section: "about", met: ({ profile }) => Boolean(profile?.locationCountry) },
  { label: "Roles you're looking for", section: "preferences", met: ({ roles }) => roles.length > 0 },
  { label: "Work mode", section: "preferences", met: ({ profile }) => Boolean(profile?.workModes.length) },
  {
    label: "Work experience",
    section: "experience",
    met: ({ profile, experiences }) => experiences.length > 0 || Boolean(profile?.noExperience),
  },
  { label: `At least ${MIN_SKILLS} skills`, section: "skills", met: ({ skills }) => skills.length >= MIN_SKILLS },
];

export const COMPLETENESS_STEPS = REQUIREMENTS.length;

export type MissingItem = Pick<Requirement, "label" | "section">;

export function getMissingItems(data: CandidateProfileData): MissingItem[] {
  return REQUIREMENTS.filter((r) => !r.met(data)).map(({ label, section }) => ({ label, section }));
}
