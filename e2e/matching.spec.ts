import { expect, test } from "@playwright/test";
import { CANDIDATE_HEADLINE, createOpenJob, setUpBothSides, topCard } from "./support/matching";
import { EMPLOYER_COMPANY, EMPLOYER_DOMAIN, OWNER, resetEmployers } from "./support/employer";
import { admin, hasServiceRoleKey, TEST_USER } from "./support/test-user";

test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

// Leave no verified company or open job behind for the other specs.
test.afterEach(async () => {
  await resetEmployers();
});

test("a like from both sides is a match, and both can get in touch", async ({ browser }) => {
  const { candidatePage, employerPage } = await setUpBothSides(browser);
  const jobId = await createOpenJob("Swipe Engineer");

  await candidatePage.goto("/");
  await expect(candidatePage.getByRole("heading", { name: "Jobs for you" })).toBeVisible();
  const job = topCard(candidatePage);
  await expect(job).toHaveAccessibleName(`Swipe Engineer at ${EMPLOYER_COMPANY}`);
  await expect(job).toContainText("Senior · Full-time · Remote");
  await expect(job.getByRole("region", { name: "Skills" })).toContainText("TypeScript");
  await candidatePage.getByRole("button", { name: "Like" }).click();
  await expect(topCard(candidatePage)).not.toHaveAccessibleName(`Swipe Engineer at ${EMPLOYER_COMPANY}`);
  // Only the company liking back makes a match.
  await expect(candidatePage.getByText("It's a match")).toBeHidden();

  await employerPage.goto(`/employers/jobs/${jobId}`);
  await employerPage.getByRole("link", { name: "Review candidates" }).click();
  await expect(employerPage).toHaveURL(`/employers/jobs/${jobId}/candidates`);
  const candidate = topCard(employerPage);
  await expect(candidate).toHaveAccessibleName(CANDIDATE_HEADLINE);
  // No name or email before a match.
  await expect(candidate).not.toContainText(TEST_USER.fullName);
  await expect(candidate).not.toContainText(TEST_USER.email);
  await employerPage.getByRole("button", { name: "Like" }).click();
  await expect(employerPage.getByText("It's a match")).toBeVisible();

  await employerPage.getByRole("link", { name: "See how to get in touch" }).click();
  await expect(employerPage).toHaveURL("/employers/matches");
  const employerMatch = employerPage.getByRole("list", { name: "Matches" }).getByRole("listitem");
  await expect(employerMatch).toContainText(TEST_USER.fullName);
  await expect(employerMatch).toContainText("for Swipe Engineer");
  await expect(employerMatch.getByRole("link", { name: "Email" })).toHaveAttribute("href", `mailto:${TEST_USER.email}`);

  await candidatePage.getByRole("link", { name: "Matches" }).click();
  await expect(candidatePage).toHaveURL("/matches");
  const candidateMatch = candidatePage.getByRole("list", { name: "Matches" }).getByRole("listitem");
  await expect(candidateMatch).toContainText("Swipe Engineer");
  await expect(candidateMatch).toContainText(EMPLOYER_COMPANY);
  await expect(candidateMatch.getByRole("link", { name: "Email" })).toHaveAttribute("href", `mailto:${OWNER.email}`);
});

test("a passed job is gone for good and never matches", async ({ browser }) => {
  const { candidatePage, employerPage } = await setUpBothSides(browser);
  const jobId = await createOpenJob("Pass Engineer");
  const name = `Pass Engineer at ${EMPLOYER_COMPANY}`;

  await candidatePage.goto("/");
  await expect(topCard(candidatePage)).toHaveAccessibleName(name);
  await candidatePage.keyboard.press("ArrowLeft");
  await expect(topCard(candidatePage)).not.toHaveAccessibleName(name);
  await expect
    .poll(async () => (await admin().from("candidate_swipes").select("liked").eq("job_id", jobId)).data)
    .toEqual([{ liked: false }]);
  await candidatePage.reload();
  await expect(candidatePage.getByRole("group", { name })).toHaveCount(0);

  await employerPage.goto(`/employers/jobs/${jobId}/candidates`);
  await expect(topCard(employerPage)).toHaveAccessibleName(CANDIDATE_HEADLINE);
  await employerPage.getByRole("button", { name: "Like" }).click();
  await expect(topCard(employerPage)).not.toHaveAccessibleName(CANDIDATE_HEADLINE);
  await employerPage.goto("/employers/matches");
  await expect(employerPage.getByText("No matches yet.")).toBeVisible();
});

test("dragging a card to the right likes it", async ({ browser }) => {
  const { candidatePage } = await setUpBothSides(browser);
  const jobId = await createOpenJob("Drag Engineer");

  await candidatePage.goto("/");
  const card = topCard(candidatePage);
  await expect(card).toHaveAccessibleName(`Drag Engineer at ${EMPLOYER_COMPANY}`);
  const box = (await card.boundingBox())!;
  const y = box.y + box.height / 2;
  // A short drag snaps back.
  await candidatePage.mouse.move(box.x + box.width / 2, y);
  await candidatePage.mouse.down();
  await candidatePage.mouse.move(box.x + box.width / 2 + 30, y, { steps: 5 });
  await candidatePage.mouse.up();
  await expect(card).toHaveAccessibleName(`Drag Engineer at ${EMPLOYER_COMPANY}`);

  await candidatePage.mouse.move(box.x + box.width / 2, y);
  await candidatePage.mouse.down();
  await candidatePage.mouse.move(box.x + box.width / 2 + 200, y, { steps: 10 });
  await candidatePage.mouse.up();
  await expect
    .poll(async () => (await admin().from("candidate_swipes").select("liked").eq("job_id", jobId)).data)
    .toEqual([{ liked: true }]);
});

test("a candidate hidden from a company doesn't see its jobs and isn't shown to it", async ({ browser }) => {
  const { candidateId, candidatePage, employerPage } = await setUpBothSides(browser);
  await admin().from("candidate_profiles").update({ hidden_company_domains: [EMPLOYER_DOMAIN] }).eq("profile_id", candidateId);
  const jobId = await createOpenJob("Hidden Engineer");

  await candidatePage.goto("/");
  await expect(candidatePage.getByRole("heading", { name: "Jobs for you" })).toBeVisible();
  await expect(candidatePage.getByRole("group", { name: `Hidden Engineer at ${EMPLOYER_COMPANY}` })).toHaveCount(0);

  await employerPage.goto(`/employers/jobs/${jobId}/candidates`);
  await expect(employerPage.getByRole("heading", { name: "Candidates" })).toBeVisible();
  await expect(employerPage.getByRole("group", { name: CANDIDATE_HEADLINE })).toHaveCount(0);
});

test("only published jobs of a verified company can review candidates", async ({ browser }) => {
  const { employerPage } = await setUpBothSides(browser);
  const jobId = await createOpenJob("Draft Engineer");
  await admin().from("jobs").update({ status: "draft" }).eq("id", jobId);

  await employerPage.goto(`/employers/jobs/${jobId}`);
  await expect(employerPage.getByRole("link", { name: "Review candidates" })).toHaveCount(0);
  await employerPage.goto(`/employers/jobs/${jobId}/candidates`);
  await expect(employerPage.getByText("Publish this job to review candidates.")).toBeVisible();

  await admin().from("jobs").update({ status: "open" }).eq("id", jobId);
  await admin().from("companies").update({ status: "pending" }).eq("domain", EMPLOYER_DOMAIN);
  await employerPage.reload();
  await expect(employerPage.getByText(`You can review candidates once ${EMPLOYER_COMPANY} is verified.`)).toBeVisible();
});
