import { describe, expect, it } from "vitest";
import { jobSchema } from "./schemas";

const job = {
  title: "Backend Engineer",
  seniority: "senior",
  employmentType: "full_time",
  workMode: "remote",
  description: "",
  skills: [],
  locationCountry: "",
  locationCity: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "EUR",
};

const publishable = { ...job, status: "open", description: "Build APIs.", skills: ["Go"], salaryMin: "50000", salaryMax: "70000" };

describe("jobSchema", () => {
  it("saves a half-written draft", () => {
    expect(jobSchema.safeParse({ ...job, status: "draft" }).success).toBe(true);
  });

  it("needs a description, skills and a salary range to publish", () => {
    const result = jobSchema.safeParse({ ...job, status: "open" });
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(["description", "skills", "salaryMin", "salaryMax"]);
    expect(jobSchema.parse(publishable)).toMatchObject({ salaryMin: 50000, salaryMax: 70000, locationCountry: null });
  });

  it("needs a country to publish an on-site or hybrid job, not a remote one", () => {
    const onsite = jobSchema.safeParse({ ...publishable, workMode: "onsite" });
    expect(onsite.error?.issues.map((i) => i.path[0])).toEqual(["locationCountry"]);
    expect(jobSchema.parse({ ...publishable, workMode: "onsite", locationCountry: "bg" }).locationCountry).toBe("BG");
  });

  it("keeps the salary range in order", () => {
    const result = jobSchema.safeParse({ ...job, status: "draft", salaryMin: "70000", salaryMax: "50000" });
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(["salaryMax"]);
  });

  it("requires the role type", () => {
    const result = jobSchema.safeParse({ ...job, status: "draft", seniority: "", workMode: "" });
    expect(result.error?.issues.map((i) => i.message)).toEqual(["Pick a seniority", "Pick a work mode"]);
  });
});
