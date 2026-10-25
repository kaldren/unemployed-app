import type { Browser, Page } from "@playwright/test";
import { seedCompleteCandidate } from "./candidate";
import { EMPLOYER_DOMAIN, openEmployerMagicLink, OWNER, resetEmployers } from "./employer";
import { admin, signIn } from "./test-user";

// Unique, so the test candidate is easy to tell apart from anyone else in the database.
export const CANDIDATE_HEADLINE = "E2E swipe candidate";

const check = <T extends { error: unknown }>(r: T) => {
  if (r.error) throw r.error;
  return r;
};

// A complete candidate in `candidatePage`, and an employer with a verified company in `employerPage`.
export async function setUpBothSides(browser: Browser) {
  await resetEmployers();
  const candidate = await browser.newContext();
  const candidateId = await signIn(candidate);
  await seedCompleteCandidate(candidateId);
  check(await admin().from("candidate_profiles").update({ headline: CANDIDATE_HEADLINE }).eq("profile_id", candidateId));

  const employer = await browser.newContext();
  const employerPage = await employer.newPage();
  await openEmployerMagicLink(employerPage, OWNER.email);
  await employerPage.waitForURL("/employers");
  check(await admin().from("companies").update({ status: "approved" }).eq("domain", EMPLOYER_DOMAIN));

  return { candidateId, candidatePage: await candidate.newPage(), employerPage };
}

// A published job for the test company, created newest so it's first in the candidate's deck.
export async function createOpenJob(title: string) {
  const supabase = admin();
  const { data: company } = check(await supabase.from("companies").select("id").eq("domain", EMPLOYER_DOMAIN).single());
  const { data: job } = check(
    await supabase
      .from("jobs")
      .insert({
        company_id: company!.id,
        title,
        description: `${title} for the e2e tests.`,
        seniority: "senior",
        employment_type: "full_time",
        work_mode: "remote",
        status: "open",
        // A fresh stamp, so viewing the deck doesn't start a real AI matching run.
        matched_at: new Date().toISOString(),
      })
      .select("id")
      .single(),
  );
  const { data: skill } = check(await supabase.from("skills").select("id").eq("slug", "typescript").single());
  check(await supabase.from("job_skills").insert({ job_id: job!.id, skill_id: skill!.id, position: 0 }));
  return job!.id as string;
}

export const REASONS = {
  candidate: "Your TypeScript backend work fits this role.",
  employer: "TypeScript backend work fits this role.",
};

// What the AI would have scored the pair; at or above 70 it reaches both decks.
export async function scorePair(jobId: string, candidateId: string, score: number) {
  check(
    await admin().from("job_matches").upsert({
      job_id: jobId,
      candidate_id: candidateId,
      score,
      candidate_reason: REASONS.candidate,
      employer_reason: REASONS.employer,
      model: "e2e",
      input_hash: "e2e",
    }),
  );
}

// The card on top of the deck.
export const topCard = (page: Page) => page.getByRole("group").filter({ visible: true }).first();
