import { describe, expect, it } from "vitest";
import { MIN_SKILLS } from "@/lib/candidate/completeness";
import { SKILL_COVERAGE_THRESHOLD } from "@/lib/matching/prompt";
import { isSeedDomain, isSeedEmail } from "./domain";
import { CANDIDATES, COMPANIES, SEED_COVERAGE_THRESHOLD, seedMatches, seedPairFits, SWIPES } from "./fixtures";

const jobs = COMPANIES.flatMap((c) => c.jobs.map((job) => ({ ...job, company: c })));
const liveJobs = jobs.filter((j) => j.status === "open" && j.company.status === "approved");
const matches = seedMatches();

describe("seed domain", () => {
  it("matches the seed domain and its subdomains only", () => {
    expect(isSeedEmail("ana@seed.test")).toBe(true);
    expect(isSeedEmail("olivia@northwind.seed.test")).toBe(true);
    expect(isSeedEmail("OLIVIA@Northwind.Seed.Test")).toBe(true);
    expect(isSeedEmail("someone@notseed.test")).toBe(false);
    expect(isSeedEmail("someone@seed.test.com")).toBe(false);
    expect(isSeedDomain("example.com")).toBe(false);
  });
});

describe("seed fixtures", () => {
  it("keeps the coverage threshold in sync with matching", () => {
    expect(SEED_COVERAGE_THRESHOLD).toBe(SKILL_COVERAGE_THRESHOLD);
  });

  it("puts every account and company under the seed domain, once", () => {
    const emails = [...CANDIDATES.map((c) => c.email), ...COMPANIES.flatMap((c) => c.employers.map((e) => e.email))];
    expect(emails.every(isSeedEmail)).toBe(true);
    expect(new Set(emails).size).toBe(emails.length);
    expect(COMPANIES.every((c) => isSeedDomain(c.domain))).toBe(true);
    expect(COMPANIES.every((c) => c.employers.filter((e) => e.role === "owner").length === 1)).toBe(true);
  });

  it("gives every candidate a complete profile", () => {
    for (const c of CANDIDATES) {
      expect(c.headline && c.about && c.locationCountry && c.role).toBeTruthy();
      expect(c.workModes.length).toBeGreaterThan(0);
      expect(c.skills.length).toBeGreaterThanOrEqual(MIN_SKILLS);
    }
  });

  it("gives jobs valid titles and salary ranges", () => {
    for (const job of jobs) {
      expect(job.title.length).toBeLessThanOrEqual(120);
      expect(job.salaryMax).toBeGreaterThanOrEqual(job.salaryMin);
    }
    expect(new Set(jobs.map((j) => j.key)).size).toBe(jobs.length);
  });

  it("matches only live jobs, above the threshold, on pairs that pass the hard filters", () => {
    for (const m of matches) {
      const job = liveJobs.find((j) => j.key === m.jobKey)!;
      const candidate = CANDIDATES.find((c) => c.key === m.candidateKey)!;
      expect(job).toBeDefined();
      expect(m.skillCoverage).toBeGreaterThan(SKILL_COVERAGE_THRESHOLD);
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(100);
      expect(seedPairFits(job, candidate)).toBe(true);
    }
  });

  it("leaves every candidate and every live job a card to swipe", () => {
    const swiped = new Set(SWIPES.candidate.map((s) => `${s.candidateKey}:${s.jobKey}`));
    for (const c of CANDIDATES) {
      expect(matches.some((m) => m.candidateKey === c.key && !swiped.has(`${c.key}:${m.jobKey}`))).toBe(true);
    }
    // Several candidates per job, so employers have a real deck to swipe.
    for (const job of liveJobs) expect(matches.filter((m) => m.jobKey === job.key).length).toBeGreaterThanOrEqual(3);
  });

  it("only swipes on matched pairs", () => {
    for (const s of [...SWIPES.candidate, ...SWIPES.employer]) {
      expect(matches.some((m) => m.jobKey === s.jobKey && m.candidateKey === s.candidateKey)).toBe(true);
    }
  });

  it("checks location and salary like the matching filters", () => {
    const maria = CANDIDATES.find((c) => c.key === "maria.ivanova")!;
    const hybridSofia = liveJobs.find((j) => j.key === "bluefin-analyst")!;
    expect(seedPairFits(hybridSofia, maria)).toBe(true);
    expect(seedPairFits(hybridSofia, { ...maria, locationCountry: "DE" })).toBe(false);
    expect(seedPairFits(hybridSofia, { ...maria, locationCountry: "DE", openToRelocation: true })).toBe(true);
    expect(seedPairFits({ ...hybridSofia, salaryMax: 1 }, maria)).toBe(false);
  });
});
