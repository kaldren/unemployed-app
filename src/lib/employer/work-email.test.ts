import { describe, expect, it } from "vitest";
import { companyNameFromDomain, emailDomain, isWorkEmail } from "./work-email";

describe("emailDomain", () => {
  it("lowercases the part after the last @", () => {
    expect(emailDomain("Ana@Acme.COM")).toBe("acme.com");
    expect(emailDomain('"a@b"@acme.io')).toBe("acme.io");
  });
});

describe("isWorkEmail", () => {
  it("accepts company domains", () => {
    expect(isWorkEmail("ana@acme.com")).toBe(true);
    expect(isWorkEmail("ana@eng.acme.co.uk")).toBe(true);
  });

  it("rejects free-mail domains, whatever the case", () => {
    for (const email of ["a@gmail.com", "a@GMAIL.com", "a@yahoo.com", "a@outlook.com", "a@proton.me", "a@abv.bg"]) {
      expect(isWorkEmail(email), email).toBe(false);
    }
  });

  it("rejects domains without a dot", () => {
    expect(isWorkEmail("a@localhost")).toBe(false);
  });
});

describe("companyNameFromDomain", () => {
  it("title-cases the first label", () => {
    expect(companyNameFromDomain("acme.com")).toBe("Acme");
    expect(companyNameFromDomain("acme-labs.co.uk")).toBe("Acme Labs");
  });
});
