import { describe, expect, it } from "vitest";
import { candidateMatchEmail, digestEmail, employerMatchEmail } from "./templates";

describe("match emails", () => {
  it("tell each side who they matched and link to their matches", () => {
    const candidate = candidateMatchEmail({ jobTitle: "Backend Engineer", companyName: "Acme" });
    expect(candidate.subject).toBe("It's a match: Backend Engineer at Acme");
    expect(candidate.text).toContain("See your match: http://localhost:3000/matches");

    const employer = employerMatchEmail({ jobTitle: "Backend Engineer", candidateName: null });
    expect(employer.text).toContain("A candidate matched with you for Backend Engineer.");
    expect(employer.html).toContain('href="http://localhost:3000/employers/matches"');
  });

  it("escape what users wrote", () => {
    const email = candidateMatchEmail({ jobTitle: "<script>x</script>", companyName: "A&B" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("A&amp;B");
  });
});

describe("digestEmail", () => {
  it("counts the new jobs and says how to stop it", () => {
    expect(digestEmail({ count: 1 }).subject).toBe("1 new job matched to you");
    expect(digestEmail({ count: 3 }).text).toContain("3 new jobs on Unemployed fit your profile.");
    expect(digestEmail({ count: 3 }).text).toContain("Turn it off in your profile");
  });
});
