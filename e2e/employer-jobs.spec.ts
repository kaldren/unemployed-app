import { expect, test, type Page } from "@playwright/test";
import { openEmployerMagicLink, OWNER, resetEmployers } from "./support/employer";
import { hasServiceRoleKey } from "./support/test-user";

test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

const JOB_URL = /\/employers\/jobs\/[0-9a-f-]{36}$/;

async function signInFresh(page: Page) {
  await resetEmployers();
  await openEmployerMagicLink(page, OWNER.email);
  await expect(page).toHaveURL("/employers");
}

// Next keeps the previous page mounted but hidden, so only look at what's on screen.
const field = (page: Page, label: string) => page.getByLabel(label, { exact: true }).filter({ visible: true });

// Controlled fields lose input typed before hydration, so retry until the value sticks.
async function fill(page: Page, label: string, value: string) {
  await expect(async () => {
    await field(page, label).fill(value);
    await expect(field(page, label)).toHaveValue(value, { timeout: 1000 });
  }).toPass();
}

test("an employer writes a job post by hand, saves it and sees it in the list", async ({ page }) => {
  await signInFresh(page);
  await page.getByRole("link", { name: "Add a job" }).click();
  await expect(page.getByRole("heading", { name: "New job" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Write draft with AI" })).toBeDisabled();

  await field(page, "Seniority").selectOption("senior");
  await field(page, "Employment type").selectOption("full_time");
  await field(page, "Work mode").selectOption("remote");
  await page.getByRole("button", { name: "Write it myself" }).click();

  await expect(page).toHaveURL(JOB_URL);
  await expect(page.getByRole("heading", { name: "Untitled job" })).toBeVisible();
  await expect(field(page, "Seniority")).toHaveValue("senior");
  const save = page.getByRole("button", { name: "Save" });
  await expect(save).toBeDisabled();

  await fill(page, "Job title", "Backend Engineer");
  await field(page, "Description").fill("Build and run our payments APIs.");
  await field(page, "Skills").fill("Go");
  await field(page, "Skills").press("Enter");
  await field(page, "Skills").fill("PostgreSQL");
  await field(page, "Skills").press("Enter");
  await expect(field(page, "Status")).toHaveValue("draft");
  await save.click();
  await expect(page.getByText("Saved")).toBeVisible();

  await field(page, "Status").selectOption("open");
  await save.click();
  await expect(page.getByText("Add a salary range before publishing").first()).toBeVisible();
  await field(page, "Country").selectOption("BG");
  await field(page, "Salary from (yearly, gross)").fill("50000");
  await field(page, "Salary to").fill("70000");
  await save.click();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload();
  await expect(field(page, "Country")).toHaveValue("BG");
  await expect(field(page, "Salary from (yearly, gross)")).toHaveValue("50000");
  await expect(field(page, "Salary to")).toHaveValue("70000");
  await expect(field(page, "Currency")).toHaveValue("EUR");
  await expect(field(page, "Status")).toHaveValue("open");
  await expect(page.getByRole("heading", { name: "Backend Engineer" })).toBeVisible();
  await expect(field(page, "Description")).toHaveValue("Build and run our payments APIs.");
  await expect(page.getByRole("list", { name: "Selected skills" }).getByRole("listitem")).toHaveText(["Go×", "PostgreSQL×"]);

  await page.getByRole("link", { name: "Unemployed" }).click();
  const job = page.getByRole("list", { name: "Jobs" }).getByRole("link");
  await expect(job).toContainText("Backend Engineer");
  await expect(job).toContainText("Published");
  await expect(job).toContainText("Senior · Full-time · Remote");
});

test("a job title and role type are required", async ({ page }) => {
  await signInFresh(page);
  await page.goto("/employers/jobs/new");
  await page.getByRole("button", { name: "Write it myself" }).click();
  await expect(page).toHaveURL(JOB_URL);

  await fill(page, "Description", "Some text");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(field(page, "Job title")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Add a job title").first()).toBeVisible();
  for (const [label, message] of [
    ["Seniority", "Pick a seniority"],
    ["Employment type", "Pick an employment type"],
    ["Work mode", "Pick a work mode"],
  ]) {
    await expect(field(page, label)).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(message).first()).toBeVisible();
  }
});

test("publishing needs a description, skills, a country and pay; drafts don't", async ({ page }) => {
  await signInFresh(page);
  await page.goto("/employers/jobs/new");
  await field(page, "Seniority").selectOption("junior");
  await field(page, "Employment type").selectOption("contract");
  await field(page, "Work mode").selectOption("onsite");
  await page.getByRole("button", { name: "Write it myself" }).click();
  await expect(page).toHaveURL(JOB_URL);

  await fill(page, "Job title", "Designer");
  await field(page, "Status").selectOption("open");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Add a description before publishing").first()).toBeVisible();
  await expect(page.getByText("Add at least one skill before publishing").first()).toBeVisible();
  await expect(page.getByText("Add a country before publishing").first()).toBeVisible();
  await expect(page.getByText("Add a salary range before publishing").first()).toBeVisible();

  await field(page, "Status").selectOption("draft");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
});

test("jobs that don't belong to the company are not found", async ({ page }) => {
  await signInFresh(page);
  await page.goto("/employers/jobs/00000000-0000-4000-8000-000000000000");
  await expect(page.getByText(/could not be found/i)).toBeVisible();
  await page.goto("/employers/jobs/not-a-uuid");
  await expect(page.getByText(/could not be found/i)).toBeVisible();
});

test.describe("with AI", () => {
  test.skip(!process.env.ANTHROPIC_API_KEY, "Set ANTHROPIC_API_KEY in .env.local to run AI drafting tests");
  test.setTimeout(120_000);

  test("AI drafts a post from a brief, then refines it", async ({ page }) => {
    await signInFresh(page);
    await page.goto("/employers/jobs/new");
    await field(page, "Seniority").selectOption("mid");
    await fill(
      page,
      "What's the role about?",
      "Frontend developer for our booking app. React and TypeScript, works closely with design.",
    );
    await page.getByRole("button", { name: "Write draft with AI" }).click();
    await expect(page.getByRole("button", { name: "Writing your draft…" })).toBeVisible();

    await expect(page).toHaveURL(JOB_URL, { timeout: 60_000 });
    await expect(field(page, "Job title")).not.toHaveValue("");
    // The AI picks what the employer left blank and keeps what they chose.
    await expect(field(page, "Seniority")).toHaveValue("mid");
    await expect(field(page, "Employment type")).not.toHaveValue("");
    await expect(field(page, "Work mode")).not.toHaveValue("");
    await expect(field(page, "Description")).not.toHaveValue("");
    await expect(page.getByRole("list", { name: "Selected skills" }).getByRole("listitem").first()).toBeVisible();

    const before = await field(page, "Description").inputValue();
    await fill(page, "What should change?", "Add a sentence saying the team is 8 people.");
    await page.getByRole("button", { name: "Refine" }).click();
    await expect(page.getByText("Draft updated. Review it, then save.")).toBeVisible({ timeout: 60_000 });
    await expect(field(page, "Description")).not.toHaveValue(before);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
  });
});
