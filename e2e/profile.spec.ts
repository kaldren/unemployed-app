import { expect, test, type Page } from "@playwright/test";
import { resetCandidate } from "./support/candidate";
import { hasServiceRoleKey, signIn } from "./support/test-user";

test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

// Sections live in tabs; open the tab, then return the section inside it.
async function section(page: Page, name: string) {
  await page.getByRole("tab", { name }).click();
  return page.getByRole("region", { name });
}

async function save(page: Page, name: string) {
  const s = await section(page, name);
  await s.getByRole("button", { name: "Save" }).click();
  await expect(s.getByText("Saved")).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await resetCandidate(await signIn(context));
});

test("an incomplete candidate is sent to /profile", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/profile");
  await expect(page.getByText("Complete your profile to get matches")).toBeVisible();
});

test("filling every required section completes the profile", async ({ page }) => {
  await page.goto("/profile");

  const about = await section(page, "About you");
  // Nothing to save until something changes.
  await expect(about.getByRole("button", { name: "Save" })).toBeDisabled();
  await about.getByLabel("Headline").fill("Backend engineer");
  await about.getByLabel("About").fill("I build reliable APIs and data pipelines.");
  await about.getByLabel("Country").selectOption("BG");
  await about.getByLabel("City").fill("Sofia");
  await save(page, "About you");

  const prefs = await section(page, "What you're looking for");
  await prefs.getByLabel("Roles").fill("Backend Engineer");
  await prefs.getByLabel("Roles").press("Enter");
  await prefs.getByLabel("Remote").check();
  await prefs.getByLabel("Minimum salary (yearly, gross)").fill("60000");
  await save(page, "What you're looking for");

  const experience = await section(page, "Work experience");
  await experience.getByRole("button", { name: "Add a job" }).click();
  await experience.getByLabel("Job title").fill("Software Engineer");
  await experience.getByLabel("Company", { exact: true }).fill("Acme");
  await experience.getByLabel("Company website").fill("https://www.acme.com/about");
  await experience.getByLabel("Start").fill("2022-03");
  await experience.getByLabel("I currently work here").check();
  await save(page, "Work experience");

  const skills = await section(page, "Skills");
  for (const skill of ["TypeScript", "postgres", "Zig"]) {
    await skills.getByLabel("Add skills", { exact: true }).fill(skill);
    await skills.getByLabel("Add skills", { exact: true }).press("Enter");
  }
  await skills.getByLabel("TypeScript level").selectOption("expert");
  await save(page, "Skills");

  await page.reload();
  await expect(page.getByText("Your profile is complete")).toBeVisible();
  await expect((await section(page, "About you")).getByLabel("Headline")).toHaveValue("Backend engineer");
  await expect((await section(page, "What you're looking for")).getByRole("listitem")).toHaveText(["Backend Engineer×"]);
  await expect((await section(page, "Work experience")).getByLabel("Company website")).toHaveValue("acme.com");
  // "postgres" lands on the existing PostgreSQL catalog entry; Zig is added to the catalog.
  await expect((await section(page, "Skills")).getByRole("cell")).toContainText(["PostgreSQL", "TypeScript", "Zig"]);
  await expect((await section(page, "Skills")).getByLabel("TypeScript level")).toHaveValue("expert");
  await expect((await section(page, "Hide my profile from")).getByLabel("Company domains")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Edit your profile" })).toBeVisible();
});

test("invalid input shows field errors and isn't saved", async ({ page }) => {
  await page.goto("/profile");
  const about = await section(page, "About you");
  await about.getByLabel("LinkedIn").fill("linkedin.com/in/me");
  await about.getByRole("button", { name: "Save" }).click();
  await expect(about.getByText("Add a headline").first()).toBeVisible();
  await expect(about.getByText("Enter a full link starting with https://")).toBeVisible();

  const experience = await section(page, "Work experience");
  await experience.getByRole("button", { name: "Add a job" }).click();
  await experience.getByLabel("Job title").fill("Engineer");
  await experience.getByLabel("Company", { exact: true }).fill("Acme");
  await experience.getByLabel("Start").fill("2023-05");
  await experience.getByLabel("End").fill("2021-01");
  await experience.getByRole("button", { name: "Save" }).click();
  await expect(experience.getByText("End date must be after the start date").first()).toBeVisible();
});
