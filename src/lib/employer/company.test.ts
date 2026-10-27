import { describe, expect, it } from "vitest";
import { canManageCompany, inviteSchema, isEmailOnDomain, newCompanySchema, normalizeDomain } from "./company";

describe("normalizeDomain", () => {
  it("takes the hostname from a domain or a link", () => {
    expect(normalizeDomain("Acme.com")).toBe("acme.com");
    expect(normalizeDomain("https://www.acme.co.uk/about?x=1")).toBe("acme.co.uk");
    expect(normalizeDomain(" eng.acme.io. ")).toBe("eng.acme.io");
  });

  it("rejects what isn't a public hostname", () => {
    for (const input of ["", "localhost", "10.0.0.1", "acme", "acme..com", "-acme.com", "acme.c0m", "a b.com"]) {
      expect(normalizeDomain(input), input).toBeNull();
    }
  });
});

describe("isEmailOnDomain", () => {
  it("matches the exact domain only, ignoring case", () => {
    expect(isEmailOnDomain("Ana@ACME.com", "acme.com")).toBe(true);
    expect(isEmailOnDomain("ana@eng.acme.com", "acme.com")).toBe(false);
    expect(isEmailOnDomain("ana@notacme.com", "acme.com")).toBe(false);
  });
});

describe("newCompanySchema", () => {
  const base = { name: "Acme", website: "", logoUrl: "", description: "" };

  it("normalizes the domain and turns blanks into null", () => {
    expect(newCompanySchema.parse({ ...base, domain: "https://www.Acme.com" })).toEqual({
      name: "Acme",
      domain: "acme.com",
      website: null,
      logoUrl: null,
      description: null,
    });
  });

  it("refuses free-mail domains and bad links", () => {
    for (const freeMail of ["GMAIL.com", "yahoo.com", "outlook.com", "proton.me", "abv.bg"]) {
      expect(newCompanySchema.safeParse({ ...base, domain: freeMail }).success, freeMail).toBe(false);
    }
    expect(newCompanySchema.safeParse({ ...base, domain: "gmail.com" }).success).toBe(false);
    expect(newCompanySchema.safeParse({ ...base, domain: "acme.com", website: "javascript:alert(1)" }).success).toBe(false);
    expect(newCompanySchema.safeParse({ ...base, domain: "acme.com", logoUrl: "ftp://acme.com/x.png" }).success).toBe(false);
  });
});

describe("inviteSchema", () => {
  it("lowercases the email and never invites an owner", () => {
    expect(inviteSchema.parse({ email: " Ana@Acme.com ", role: "admin" })).toEqual({ email: "ana@acme.com", role: "admin" });
    expect(inviteSchema.safeParse({ email: "ana@acme.com", role: "owner" }).success).toBe(false);
  });
});

describe("canManageCompany", () => {
  it("lets owners and admins manage, not recruiters", () => {
    expect(canManageCompany("owner")).toBe(true);
    expect(canManageCompany("admin")).toBe(true);
    expect(canManageCompany("recruiter")).toBe(false);
  });
});
