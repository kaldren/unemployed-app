import { expect, test } from "@playwright/test";
import { seedCompleteCandidate } from "./support/candidate";
import { hasServiceRoleKey, signIn, TEST_USER } from "./support/test-user";

const googleButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Continue with Google" });

test.describe("signed out", () => {
  test("protected page redirects to /login and keeps the path", async ({ page }) => {
    await page.goto("/jobs?tab=new");
    await expect(page).toHaveURL("/login?next=%2Fjobs%3Ftab%3Dnew");
    await expect(googleButton(page)).toBeEnabled();
  });

  test("cancelled Google consent shows a message", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied");
    await expect(page).toHaveURL("/login?error=cancelled");
    await expect(page.getByRole("alert").filter({ hasText: /Sign-in was cancelled/ })).toBeVisible();
  });

  test("failed sign-in shows a message", async ({ page }) => {
    await page.goto("/auth/callback?code=not-a-real-code");
    await expect(page).toHaveURL("/login?error=failed");
    await expect(page.getByRole("alert").filter({ hasText: /Something went wrong/ })).toBeVisible();
  });
});

test.describe("signed in", () => {
  test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

  test("home shows the user; /login redirects home", async ({ page, context }) => {
    await seedCompleteCandidate(await signIn(context));

    await page.goto("/");
    await expect(page.getByRole("heading", { name: `Welcome, ${TEST_USER.fullName}` })).toBeVisible();
    await expect(page.getByText(TEST_USER.email)).toBeVisible();

    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("sign out returns to /login and protects home again", async ({ page, context }) => {
    await seedCompleteCandidate(await signIn(context));

    await page.goto("/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");

    await page.goto("/");
    await expect(page).toHaveURL("/login?next=%2F");
  });

  test("session without a profile is cleared", async ({ page, context }) => {
    await signIn(context, { withProfile: false });

    await page.goto("/");
    await expect(page).toHaveURL("/login?error=session");
    await expect(page.getByRole("alert").filter({ hasText: /Your session has ended/ })).toBeVisible();
  });
});
