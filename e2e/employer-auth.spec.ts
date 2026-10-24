import { expect, test } from "@playwright/test";
import {
  EMPLOYER_COMPANY,
  EMPLOYER_DOMAIN,
  membership,
  openEmployerMagicLink,
  OWNER,
  resetEmployers,
  TEAMMATE,
} from "./support/employer";
import { hasServiceRoleKey, signIn, TEST_USER } from "./support/test-user";

test.describe("signed out", () => {
  test("employer pages redirect to the employer sign-in and keep the path", async ({ page }) => {
    await page.goto("/employers");
    await expect(page).toHaveURL("/employers/login?next=%2Femployers");
    await expect(page.getByRole("heading", { name: "Unemployed for employers" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  test("candidate and employer sign-in pages link to each other", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Hiring? Sign in as an employer" }).click();
    await expect(page).toHaveURL("/employers/login");
    await page.getByRole("link", { name: "Looking for a job? Sign in here" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("personal email is rejected before any email is sent", async ({ page }) => {
    await page.goto("/employers/login");
    const submit = page.getByRole("button", { name: "Email me a sign-in link" });
    await expect(submit).toBeDisabled();

    // Typing before hydration is lost, so retry until the form reacts.
    await expect(async () => {
      await page.getByLabel("Work email").fill("someone@gmail.com");
      await expect(submit).toBeEnabled({ timeout: 1000 });
    }).toPass();
    await submit.click();
    await expect(page.getByRole("alert").filter({ hasText: /Use your work email/ })).toBeVisible();
    await expect(page.getByLabel("Work email")).toHaveAttribute("aria-invalid", "true");
  });

  test("cancelled Google consent returns to the employer sign-in", async ({ page }) => {
    await page.goto("/auth/callback?portal=employer&error=access_denied");
    await expect(page).toHaveURL("/employers/login?error=cancelled");
    await expect(page.getByRole("alert").filter({ hasText: /Sign-in was cancelled/ })).toBeVisible();
  });
});

test.describe("signed in", () => {
  test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

  test("first employer from a domain creates the company; the next one joins it", async ({ page, context }) => {
    const [ownerId, teammateId] = await resetEmployers();

    await openEmployerMagicLink(page, OWNER.email);
    await expect(page).toHaveURL("/employers");
    await expect(page.getByRole("heading", { name: `Welcome, ${OWNER.fullName}` })).toBeVisible();
    await expect(page.getByText(`Hiring for ${EMPLOYER_COMPANY}`)).toBeVisible();
    expect(await membership(ownerId!)).toMatchObject({
      role: "owner",
      companies: { domain: EMPLOYER_DOMAIN, name: EMPLOYER_COMPANY, status: "pending" },
    });

    await context.clearCookies();
    await openEmployerMagicLink(page, TEAMMATE.email);
    await expect(page).toHaveURL("/employers");
    expect(await membership(teammateId!)).toMatchObject({ role: "member", companies: { domain: EMPLOYER_DOMAIN } });
  });

  test("employers stay in the employer area and sign out to the employer sign-in", async ({ page }) => {
    await resetEmployers();
    await openEmployerMagicLink(page, OWNER.email);
    await expect(page).toHaveURL("/employers");

    for (const path of ["/", "/profile", "/employers/login"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/employers");
    }

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/employers/login");
    await page.goto("/employers");
    await expect(page).toHaveURL("/employers/login?next=%2Femployers");
  });

  test("a candidate account can't sign in as an employer", async ({ page, context }) => {
    await signIn(context);
    await context.clearCookies();

    await openEmployerMagicLink(page, TEST_USER.email);
    await expect(page).toHaveURL("/employers/login?error=candidate_account");
    await expect(page.getByRole("alert").filter({ hasText: /already has a candidate account/ })).toBeVisible();
    await page.goto("/employers");
    await expect(page).toHaveURL("/employers/login?next=%2Femployers");
  });

  test("candidates are sent home from employer pages", async ({ page, context }) => {
    await signIn(context);
    await page.goto("/employers");
    await expect(page).not.toHaveURL(/\/employers/);
  });
});
