import { expect, test } from "@playwright/test";
import { seedCompleteCandidate } from "./support/candidate";
import { EMPLOYER_DOMAIN, membership, openEmployerMagicLink, OWNER, resetEmployers, TEAMMATE } from "./support/employer";
import { admin, hasServiceRoleKey, signIn } from "./support/test-user";

test("visitors see the landing page, with ways in and the legal pages", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Jobs where both sides say yes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();

  await page.getByRole("link", { name: "Hire with us" }).click();
  await expect(page).toHaveURL("/employers/login");
  await expect(page.getByText("By continuing you agree to our Terms and Privacy Policy.")).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Find a job" }).click();
  await expect(page).toHaveURL("/login");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How the AI is used" })).toBeVisible();

  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(page).toHaveURL("/terms");
  await expect(page.getByRole("heading", { name: "Terms", exact: true })).toBeVisible();
});

test.describe("deleting an account", () => {
  test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

  const LEAVER = { email: "e2e-leaver@example.com", fullName: "E2E Leaver" };

  test("a candidate deletes their account and everything in it", async ({ page, context }) => {
    const userId = await signIn(context, { user: LEAVER });
    await seedCompleteCandidate(userId);

    await page.goto("/profile");
    await page.getByRole("tab", { name: "Account" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete my account" }).click();

    await expect(page.getByRole("heading", { name: "Jobs where both sides say yes" })).toBeVisible();
    const { data: user } = await admin().auth.admin.getUserById(userId);
    expect(user.user).toBeNull();
    const { count } = await admin()
      .from("candidate_profiles")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", userId);
    expect(count).toBe(0);
  });

  test("an employer who is the company's only member deletes it with their account", async ({ page }) => {
    await resetEmployers();
    await openEmployerMagicLink(page, OWNER.email);
    await expect(page).toHaveURL("/employers");

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page).toHaveURL("/employers");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page.getByRole("heading", { name: "Jobs where both sides say yes" })).toBeVisible();
    const { count } = await admin()
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("domain", EMPLOYER_DOMAIN);
    expect(count).toBe(0);
  });

  test("when the owner leaves, the company stays and a teammate becomes owner", async ({ page, context }) => {
    const [, teammateId] = await resetEmployers();
    await openEmployerMagicLink(page, OWNER.email);
    await expect(page).toHaveURL("/employers");
    await context.clearCookies();
    await openEmployerMagicLink(page, TEAMMATE.email);
    await expect(page).toHaveURL("/employers");
    await context.clearCookies();
    await openEmployerMagicLink(page, OWNER.email);
    await expect(page).toHaveURL("/employers");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page.getByRole("heading", { name: "Jobs where both sides say yes" })).toBeVisible();
    expect(await membership(teammateId!)).toMatchObject({ role: "owner", companies: { domain: EMPLOYER_DOMAIN } });
  });
});
