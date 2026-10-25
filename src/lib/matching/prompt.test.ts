import { describe, expect, it } from "vitest";
import { buildMatchPrompt, clampScore, matchInputHash, type MatchCandidate, type MatchJob } from "./prompt";

const job: MatchJob = {
  title: "Backend Engineer",
  companyName: "Acme",
  description: "Build our APIs.",
  skills: ["TypeScript", "PostgreSQL"],
  seniority: "senior",
  employmentType: "full_time",
  workMode: "remote",
};

const candidate: MatchCandidate = {
  headline: "Backend engineer",
  about: "I build reliable APIs.",
  locationCity: "Sofia",
  locationCountry: "BG",
  openToRelocation: false,
  seniority: "senior",
  workModes: ["remote", "hybrid"],
  employmentTypes: [],
  roles: ["Backend Engineer"],
  skills: [
    { name: "TypeScript", level: "expert", years: 6 },
    { name: "Docker", level: null, years: null },
  ],
  experiences: [
    { title: "Engineer", companyName: "Globex", startDate: "2020-03-01", endDate: null, description: "Payments API." },
  ],
  educations: [{ institution: "Sofia University", degree: "BSc", fieldOfStudy: "Computer Science", endYear: 2019 }],
  certifications: [],
  languages: [{ languageCode: "en", proficiency: "professional" }],
};

describe("buildMatchPrompt", () => {
  const prompt = buildMatchPrompt(job, candidate);

  it("includes the job and the candidate's work", () => {
    expect(prompt).toContain("Title: Backend Engineer");
    expect(prompt).toContain("Seniority: Senior");
    expect(prompt).toContain("Skills, most important first: TypeScript, PostgreSQL");
    expect(prompt).toContain("Location: Sofia, Bulgaria");
    expect(prompt).toContain("Work modes: Remote, Hybrid");
    expect(prompt).toContain("- TypeScript, Expert, 6 years");
    expect(prompt).toContain("- Docker\n");
    expect(prompt).toContain("- Engineer at Globex, 2020-03 to now\n  Payments API.");
    expect(prompt).toContain("- BSc, Computer Science, Sofia University, 2019");
    expect(prompt).toContain("- English: Professional");
  });

  it("leaves out empty sections", () => {
    expect(prompt).not.toContain("Certifications:");
    expect(prompt).not.toContain("Employment types:");
  });
});

describe("matchInputHash", () => {
  it("changes with the model or the prompt", () => {
    const hash = matchInputHash("claude-sonnet-5-5", "a");
    expect(matchInputHash("claude-sonnet-5-5", "a")).toBe(hash);
    expect(matchInputHash("claude-opus-5-5", "a")).not.toBe(hash);
    expect(matchInputHash("claude-sonnet-5-5", "b")).not.toBe(hash);
  });
});

describe("clampScore", () => {
  it("keeps the score in 0-100 and trims the reasons", () => {
    expect(clampScore({ score: 140, candidateReason: " Yes ", employerReason: "x".repeat(500) })).toEqual({
      score: 100,
      candidateReason: "Yes",
      employerReason: "x".repeat(400),
    });
    expect(clampScore({ score: -3, candidateReason: "", employerReason: "" }).score).toBe(0);
  });
});
