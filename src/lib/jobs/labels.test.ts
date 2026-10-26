import { describe, expect, it } from "vitest";
import { locationLabel, roleTypeLabel, salaryLabel } from "./labels";

describe("roleTypeLabel", () => {
  it("joins every part in order", () => {
    expect(roleTypeLabel({ seniority: "senior", employmentType: "full_time", workMode: "remote" })).toBe(
      "Senior · Full-time · Remote",
    );
  });

  it("skips parts that aren't set", () => {
    expect(roleTypeLabel({ seniority: null, employmentType: "contract", workMode: null })).toBe("Contract");
    expect(roleTypeLabel({ seniority: null, employmentType: null, workMode: null })).toBe("");
  });
});

describe("locationLabel", () => {
  it("names the place, or where remote work is open to", () => {
    expect(locationLabel({ workMode: "onsite", locationCity: "Sofia", locationCountry: "BG" })).toBe("Sofia, Bulgaria");
    expect(locationLabel({ workMode: "remote", locationCity: null, locationCountry: "BG" })).toBe("Remote from Bulgaria");
    expect(locationLabel({ workMode: "remote", locationCity: null, locationCountry: null })).toBe("Remote from anywhere");
    expect(locationLabel({ workMode: "hybrid", locationCity: null, locationCountry: null })).toBe("");
  });
});

describe("salaryLabel", () => {
  it("shows a range, a single figure, or nothing", () => {
    expect(salaryLabel({ salaryMin: 50000, salaryMax: 70000, salaryCurrency: "EUR" })).toBe("EUR 50,000–70,000 a year");
    expect(salaryLabel({ salaryMin: 60000, salaryMax: 60000, salaryCurrency: "USD" })).toBe("USD 60,000 a year");
    expect(salaryLabel({ salaryMin: 50000, salaryMax: null, salaryCurrency: "EUR" })).toBe("");
  });
});
