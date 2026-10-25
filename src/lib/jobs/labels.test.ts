import { describe, expect, it } from "vitest";
import { roleTypeLabel } from "./labels";

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
