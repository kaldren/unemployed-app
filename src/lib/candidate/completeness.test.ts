import { describe, expect, it } from "vitest";
import { COMPLETENESS_STEPS, getMissingItems } from "./completeness";
import type { CandidateProfileData } from "./queries";

const empty: CandidateProfileData = {
  profile: null,
  experiences: [],
  skills: [],
  roles: [],
  educations: [],
  certifications: [],
  languages: [],
};

const complete = {
  ...empty,
  profile: { headline: "Engineer", about: "I build things.", locationCountry: "BG", workModes: ["remote"], noExperience: true },
  roles: ["Backend Engineer"],
  skills: [{ name: "Go" }, { name: "SQL" }, { name: "Docker" }],
} as unknown as CandidateProfileData;

describe("getMissingItems", () => {
  it("lists every requirement for an empty profile", () => {
    const missing = getMissingItems(empty);
    expect(missing).toHaveLength(COMPLETENESS_STEPS);
    expect(new Set(missing.map((m) => m.section))).toEqual(new Set(["about", "preferences", "experience", "skills"]));
  });

  it("is empty for a complete profile", () => {
    expect(getMissingItems(complete)).toEqual([]);
  });

  it("needs experience unless the candidate has none", () => {
    const data = { ...complete, profile: { ...complete.profile!, noExperience: false } };
    expect(getMissingItems(data)).toEqual([{ label: "Work experience", section: "experience" }]);
  });

  it("needs the minimum number of skills", () => {
    expect(getMissingItems({ ...complete, skills: complete.skills.slice(0, 2) }).map((m) => m.section)).toEqual(["skills"]);
  });
});
