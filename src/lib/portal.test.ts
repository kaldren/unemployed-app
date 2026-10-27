import { describe, expect, it } from "vitest";
import { authErrorMessage, parseView } from "./portal";

describe("parseView", () => {
  it("accepts the two views", () => {
    expect(parseView("candidate")).toBe("candidate");
    expect(parseView("employer")).toBe("employer");
  });

  it("rejects anything else", () => {
    for (const value of [null, undefined, "", "admin", "Employer", 1]) expect(parseView(value)).toBeNull();
  });
});

describe("authErrorMessage", () => {
  it("maps known codes and falls back for unknown ones", () => {
    expect(authErrorMessage("cancelled")).toMatch(/cancelled/);
    expect(authErrorMessage("candidate_account")).toMatch(/Something went wrong/);
    expect(authErrorMessage("constructor")).toMatch(/Something went wrong/);
    expect(authErrorMessage(undefined)).toBeNull();
  });
});
