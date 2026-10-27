import { describe, expect, it } from "vitest";
import { displayName, firstNameOf, hasName, initials, nameSchema, splitFullName } from "./name";

describe("splitFullName", () => {
  it("takes the first word as first name and the rest as last name", () => {
    expect(splitFullName("  Ana  Maria Petrova ")).toEqual({ firstName: "Ana", lastName: "Maria Petrova" });
  });
  it("handles one word and nothing", () => {
    expect(splitFullName("Ana")).toEqual({ firstName: "Ana", lastName: null });
    expect(splitFullName(null)).toEqual({ firstName: null, lastName: null });
    expect(splitFullName("   ")).toEqual({ firstName: null, lastName: null });
  });
});

describe("nameSchema", () => {
  it("trims and requires both parts", () => {
    expect(nameSchema.parse({ firstName: " Ana ", lastName: "Petrova" })).toEqual({ firstName: "Ana", lastName: "Petrova" });
    const result = nameSchema.safeParse({ firstName: "Ana", lastName: "  " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter your last name");
  });
  it("caps the length", () => {
    expect(nameSchema.safeParse({ firstName: "a".repeat(51), lastName: "b" }).success).toBe(false);
  });
});

describe("display helpers", () => {
  const email = "ana@example.com";
  it("prefers first and last name, then full name, then email", () => {
    expect(displayName({ firstName: "Ana", lastName: "Petrova", fullName: "Old Name", email })).toBe("Ana Petrova");
    expect(displayName({ fullName: "Ana Petrova", email })).toBe("Ana Petrova");
    expect(displayName({ email })).toBe(email);
  });
  it("finds a first name", () => {
    expect(firstNameOf({ firstName: "Ana", fullName: "X Y" })).toBe("Ana");
    expect(firstNameOf({ fullName: "Ana Petrova" })).toBe("Ana");
    expect(firstNameOf({})).toBeNull();
  });
  it("makes initials", () => {
    expect(initials({ firstName: "ana", lastName: "Maria Petrova", email })).toBe("AP");
    expect(initials({ email })).toBe("A");
  });
  it("needs both parts to count as named", () => {
    expect(hasName({ firstName: "Ana", lastName: null })).toBe(false);
    expect(hasName({ firstName: "Ana", lastName: "Petrova" })).toBe(true);
  });
});
