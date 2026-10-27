import { expect, test } from "@playwright/test";
import { seedCompleteCandidate } from "./support/candidate";
import { admin, hasServiceRoleKey, signIn, signOutFromMenu, TEST_USER } from "./support/test-user";

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

  test("unknown error codes show the generic message", async ({ page }) => {
    await page.goto("/login?error=constructor");
    await expect(page.getByRole("alert").filter({ hasText: /Something went wrong/ })).toBeVisible();
  });
});

test.describe("signed in", () => {
  test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

  test("home shows the job deck; /login redirects home", async ({ page, context }) => {
    await seedCompleteCandidate(await signIn(context));

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Jobs for you" })).toBeVisible();

    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("sign out returns to /login and protects home again", async ({ page, context }) => {
    await seedCompleteCandidate(await signIn(context));

    await page.goto("/");
    await signOutFromMenu(page);
    await expect(page).toHaveURL("/login");

    await page.goto("/profile");
    await expect(page).toHaveURL("/login?next=%2Fprofile");
  });

  test("header navigates between home and profile", async ({ page, context }) => {
    await seedCompleteCandidate(await signIn(context));

    await page.goto("/");
    await page.getByRole("link", { name: "Profile", exact: true }).click();
    await expect(page).toHaveURL("/profile");
    await page.getByRole("link", { name: "Unemployed" }).click();
    await expect(page).toHaveURL("/");
  });

  test("the account menu shows the name and opens settings, where the name can change", async ({ page, context }) => {
    const userId = await signIn(context);
    await seedCompleteCandidate(userId);

    await page.goto("/");
    await page.getByRole("button", { name: `Account: ${TEST_USER.fullName}` }).click();
    await expect(page.getByRole("menu")).toContainText(TEST_USER.email);
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page).toHaveURL("/account");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    const firstName = page.getByLabel("First name");
    await expect(firstName).toHaveValue("E2E");
    await expect(async () => {
      await firstName.fill("");
      await expect(page.getByText("Changes to save")).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Enter your first name" })).toBeVisible();

    await firstName.fill("Renamed");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    await expect(page.getByRole("button", { name: "Account: Renamed Candidate" })).toBeVisible();
    const { data } = await admin().from("profiles").select("first_name, last_name, full_name").eq("id", userId).single();
    expect(data).toEqual({ first_name: "Renamed", last_name: "Candidate", full_name: "Renamed Candidate" });
  });

  test("an account without a name is asked for it before anything else", async ({ page, context }) => {
    const userId = await signIn(context);
    const { error } = await admin()
      .from("profiles")
      .update({ default_view: null, first_name: null, last_name: null, full_name: null })
      .eq("id", userId);
    if (error) throw error;

    await page.goto("/");
    await expect(page).toHaveURL("/welcome");
    await expect(page.getByRole("heading", { name: "What's your name?" })).toBeVisible();
    await expect(async () => {
      await page.getByLabel("First name").fill("Nova");
      await page.getByLabel("Last name").fill("Name");
      await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 1000 });
    }).toPass();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "What do you want to do first?" })).toBeVisible();
    await expect(page.getByText("Welcome, Nova")).toBeVisible();
  });

  test("session without a profile is cleared", async ({ page, context }) => {
    await signIn(context, { withProfile: false });

    await page.goto("/");
    await expect(page).toHaveURL("/login?error=session");
    await expect(page.getByRole("alert").filter({ hasText: /Your session has ended/ })).toBeVisible();
  });
});
