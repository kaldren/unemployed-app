import { describe, expect, it } from "vitest";
import { emailDomain } from "./work-email";

describe("emailDomain", () => {
  it("lowercases the part after the last @", () => {
    expect(emailDomain("Ana@Acme.COM")).toBe("acme.com");
    expect(emailDomain('"a@b"@acme.io')).toBe("acme.io");
  });
});
