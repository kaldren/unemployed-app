import { expect, test } from "@playwright/test";
import { openEmployerMagicLink, OWNER, resetEmployers } from "./support/employer";
import { clearInbox, latestAuthLink } from "./support/mailpit";
import { admin, getOrCreateUserId, hasServiceRoleKey, signIn, TEST_USER } from "./support/test-user";

// Any email may hire, personal ones included.
const NEW_EMPLOYER = { email: "e2e-new-employer@gmail.com", fullName: "E2E New Employer" };
const PASSWORD = "correct-horse-battery";

async function deleteUser(email: string) {
  const { error } = await admin().auth.admin.deleteUser(await getOrCreateUserId({ email, fullName: "" }));
  if (error) throw error;
}

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

  test("sign-in offers Google and email with password, and says when the password is wrong", async ({ page }) => {
    await page.goto("/employers/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    const submit = page.getByRole("button", { name: "Sign in", exact: true });
    await expect(submit).toBeDisabled();

    // Typing before hydration is lost, so retry until the form reacts.
    await expect(async () => {
      await page.getByLabel("Email").fill("nobody@example.com");
      await page.getByLabel("Password").fill("not-the-password");
      await expect(submit).toBeEnabled({ timeout: 1000 });
    }).toPass();
    await submit.click();
    await expect(page.getByRole("alert").filter({ hasText: /Wrong email or password/ })).toBeVisible();

    // A sent reset link doesn't stick: asking again shows the form.
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByRole("button", { name: "Email me a reset link" }).click();
    await expect(page.getByText(/we sent it a link to reset the password/)).toBeVisible();
    await page.getByRole("button", { name: "Back to sign in" }).click();
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByRole("button", { name: "Email me a reset link" })).toBeVisible();
  });

  test("cancelled Google consent returns to the employer sign-in", async ({ page }) => {
    await page.goto("/auth/callback?portal=employer&error=access_denied");
    await expect(page).toHaveURL("/employers/login?error=cancelled");
    await expect(page.getByRole("alert").filter({ hasText: /Sign-in was cancelled/ })).toBeVisible();
  });
});

test.describe("signed in", () => {
  test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

  test("any email signs up with a password, confirms it, and is asked to set up a company", async ({ page }) => {
    const email = NEW_EMPLOYER.email;
    await deleteUser(email);
    await clearInbox(email);

    await page.goto("/employers/login");
    await expect(async () => {
      await page.getByRole("button", { name: "Create an account" }).click();
      await expect(page.getByRole("button", { name: "Create account" })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /at least 8 characters/ })).toBeVisible();

    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/Check your inbox to confirm/)).toBeVisible();

    // Unconfirmed: password sign-in is refused until the link is opened.
    await page.getByRole("button", { name: "Back to sign in" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Confirm your email first/ })).toBeVisible();

    await page.goto(await latestAuthLink(email));
    await expect(page).toHaveURL("/employers/company/new");
    await expect(page.getByRole("heading", { name: "Set up your company" })).toBeVisible();
    // A personal address leaves the domain for the employer to fill in.
    await expect(page.getByLabel("Domain")).toHaveValue("");
  });

  test("Google, password and email links reach one account for the same email", async ({ page, context }) => {
    // An account with no password, as Google (or an email link) creates it.
    const email = NEW_EMPLOYER.email;
    await deleteUser(email);
    const userId = await getOrCreateUserId(NEW_EMPLOYER);
    await clearInbox(email);

    // Signing up again with that email creates nothing, and says what to do.
    await page.goto("/employers/login");
    await expect(async () => {
      await page.getByRole("button", { name: "Create an account" }).click();
      await expect(page.getByRole("button", { name: "Create account" })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /already has an account\. Sign in, continue with Google, or reset your password/ })).toBeVisible();
    expect(await getOrCreateUserId(NEW_EMPLOYER)).toBe(userId);

    // Resetting the password adds email sign-in to the same account.
    await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a reset link" }).click();
    await expect(page.getByText(/we sent it a link to reset the password/)).toBeVisible();
    await page.goto(await latestAuthLink(email));
    await expect(page).toHaveURL("/employers/password");
    await page.getByLabel("New password").fill(PASSWORD);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL("/employers/company/new");

    await context.clearCookies();
    await page.goto("/employers/login");
    await expect(async () => {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(PASSWORD);
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled({ timeout: 1000 });
    }).toPass();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/employers/company/new");
    const { data } = await admin().auth.admin.getUserById(userId);
    expect(data.user?.identities?.map((i) => i.provider)).toEqual(["email"]);
    const { count } = await admin().from("profiles").select("*", { count: "exact", head: true }).eq("email", email);
    expect(count).toBe(1);
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
