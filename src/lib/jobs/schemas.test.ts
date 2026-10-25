import { describe, expect, it } from "vitest";
import { jobSchema } from "./schemas";

const job = {
  title: "Backend Engineer",
  seniority: "senior",
  employmentType: "full_time",
  workMode: "remote",
  description: "",
  skills: [],
};

describe("jobSchema", () => {
  it("saves a half-written draft", () => {
    expect(jobSchema.safeParse({ ...job, status: "draft" }).success).toBe(true);
  });

  it("needs a description and skills to publish", () => {
    const result = jobSchema.safeParse({ ...job, status: "open" });
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(["description", "skills"]);
    expect(jobSchema.safeParse({ ...job, status: "open", description: "Build APIs.", skills: ["Go"] }).success).toBe(true);
  });

  it("requires the role type", () => {
    const result = jobSchema.safeParse({ ...job, status: "draft", seniority: "", workMode: "" });
    expect(result.error?.issues.map((i) => i.message)).toEqual(["Pick a seniority", "Pick a work mode"]);
  });
});
