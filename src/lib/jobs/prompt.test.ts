import { describe, expect, it } from "vitest";
import { buildDraftPrompt, clampDraft, keepChosenRoleType } from "./prompt";
import { JOB_SKILLS_MAX, JOB_TITLE_MAX } from "./schemas";

const roleType = { seniority: "senior", employmentType: "full_time", workMode: null } as const;
const picked = { seniority: "junior", employmentType: "contract", workMode: "hybrid" } as const;

describe("buildDraftPrompt", () => {
  it("includes the company, the chosen role type and the brief", () => {
    const prompt = buildDraftPrompt({ companyName: "Acme", roleType, brief: "We need someone for payments." });
    expect(prompt).toContain("Company: Acme");
    expect(prompt).toContain("Seniority: Senior");
    expect(prompt).toContain("Employment type: Full-time");
    expect(prompt).not.toContain("Work mode");
    expect(prompt).toContain("We need someone for payments.");
  });

  it("leaves out the role type when the employer chose none", () => {
    const prompt = buildDraftPrompt({
      companyName: "Acme",
      roleType: { seniority: null, employmentType: null, workMode: null },
      brief: "Payments.",
    });
    expect(prompt).not.toContain("The employer chose");
  });

  it("sends the current post and the instruction when refining", () => {
    const prompt = buildDraftPrompt({
      companyName: "Acme",
      roleType,
      current: { ...roleType, title: "Backend Engineer", description: "Build APIs.", skills: ["Go", "PostgreSQL"] },
      instruction: "Make it shorter",
    });
    expect(prompt).toContain("Title: Backend Engineer");
    expect(prompt).toContain("Seniority: Senior");
    expect(prompt).toContain("Skills: Go, PostgreSQL");
    expect(prompt).toContain("Build APIs.");
    expect(prompt).toContain("Make it shorter");
  });
});

describe("clampDraft", () => {
  it("trims, dedupes skills by slug and caps lengths", () => {
    const draft = clampDraft({
      ...picked,
      title: `  ${"x".repeat(200)} `,
      description: "  Hello  ",
      skills: ["React", "react.js", "  Node   JS ", "", ...Array.from({ length: 30 }, (_, i) => `Skill ${i}`)],
    });
    expect(draft.title).toHaveLength(JOB_TITLE_MAX);
    expect(draft.description).toBe("Hello");
    expect(draft.skills.slice(0, 3)).toEqual(["React", "Node JS", "Skill 0"]);
    expect(draft.skills).toHaveLength(JOB_SKILLS_MAX);
    expect(draft.workMode).toBe("hybrid");
  });
});

describe("keepChosenRoleType", () => {
  it("keeps the employer's choices and fills the blanks from the draft", () => {
    const draft = { ...picked, title: "", description: "", skills: [] };
    expect(keepChosenRoleType(roleType, draft)).toMatchObject({
      seniority: "senior",
      employmentType: "full_time",
      workMode: "hybrid",
    });
  });
});
