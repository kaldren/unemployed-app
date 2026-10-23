import { describe, expect, it } from "vitest";
import { cleanName, normalizeSlug } from "./slug";

describe("normalizeSlug", () => {
  it("maps common spellings to one catalog entry", () => {
    expect(normalizeSlug("React.js")).toBe("react");
    expect(normalizeSlug("ReactJS")).toBe("react");
    expect(normalizeSlug("Postgres")).toBe("postgresql");
  });

  it("keeps symbols that change meaning", () => {
    expect(normalizeSlug("C++")).toBe("c-plus-plus");
    expect(normalizeSlug("C#")).toBe("c-sharp");
  });

  it("strips accents", () => {
    expect(normalizeSlug("Café")).toBe("cafe");
  });
});

describe("cleanName", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanName("  Next   js ")).toBe("Next js");
  });
});
