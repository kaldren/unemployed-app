import { expect, test, type Page } from "@playwright/test";
import { seedCompleteCandidate } from "./support/candidate";
import { openEmployerMagicLink, OWNER, resetEmployers } from "./support/employer";
import { clearInbox, latestAuthLink } from "./support/mailpit";
import { admin, getOrCreateUserId, hasServiceRoleKey, signIn, signOutFromMenu } from "./support/test-user";

// Any email may sign up, personal ones included.
const NEW_USER = { email: "e2e-new-user@gmail.com", fullName: "E2E New User" };
const BOTH = { email: "e2e-both@example.com", fullName: "E2E Both" };
const BOTH_DOMAIN = "both-e2e.test";
const PASSWORD = "correct-horse-battery";

async function deleteUser(email: string) {
  const { error } = await admin().auth.admin.deleteUser(await getOrCreateUserId({ email, fullName: "" }));
  if (error) throw error;
}

async function defaultView(userId: string) {
  const { data, error } = await admin().from("profiles").select("default_view").eq("id", userId).single();
  if (error) throw error;
  return data.default_view as string | null;
}

// Typing before hydration is lost, so retry until the form reacts.
async function openSignUp(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: "Create an account" }).click();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible({ timeout: 1000 });
  }).toPass();
}

test.describe("signed out", () => {
  test("hiring pages redirect to the one sign-in page and keep the path", async ({ page }) => {
    await page.goto("/employers");
    await expect(page).toHaveURL("/login?next=%2Femployers");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("the old employer sign-in page forwards to /login", async ({ page }) => {
    await page.goto("/employers/login?next=%2Femployers%2Fcompany%2Fnew");
    await expect(page).toHaveURL("/login?next=%2Femployers%2Fcompany%2Fnew");
    await page.goto("/employers/login");
    await expect(page).toHaveURL("/login");
  });

  test("sign-in offers Google and email with password, and says when the password is wrong", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    const submit = page.getByRole("button", { name: "Sign in", exact: true });
    await expect(submit).toBeDisabled();

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
});

test.describe("signed in", () => {
  test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

  test("a new account confirms its email, is asked what to do first, and lands there", async ({ page, context }) => {
    const email = NEW_USER.email;
    await deleteUser(email);
    await clearInbox(email);

    await page.goto("/login");
    await openSignUp(page);
    await page.getByLabel("First name").fill("Nia");
    await page.getByLabel("Last name").fill("Newman");
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
    await expect(page).toHaveURL("/welcome");
    await expect(page.getByRole("heading", { name: "What do you want to do first?" })).toBeVisible();
    await page.getByRole("button", { name: /^Hire/ }).click();
    await expect(page).toHaveURL("/employers/company/new");
    // The name given at sign-up is the account's name.
    await expect(page.getByRole("button", { name: "Account: Nia Newman" })).toBeVisible();
    // A personal address leaves the domain for the user to fill in.
    await expect(page.getByLabel("Domain")).toHaveValue("");
    const userId = await getOrCreateUserId(NEW_USER);
    expect(await defaultView(userId)).toBe("employer");

    // The answer picks where they land next time, not what they can do.
    await context.clearCookies();
    await page.goto("/login");
    await expect(async () => {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(PASSWORD);
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled({ timeout: 1000 });
    }).toPass();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/employers/company/new");
    await page.getByRole("button", { name: "Find jobs" }).click();
    await expect(page).toHaveURL("/profile");
    expect(await defaultView(userId)).toBe("candidate");
  });

  test("Google, password and email links reach one account for the same email", async ({ page, context }) => {
    // An account with no password, as Google (or an email link) creates it.
    const email = NEW_USER.email;
    await deleteUser(email);
    const userId = await getOrCreateUserId(NEW_USER);
    await clearInbox(email);

    // Signing up again with that email creates nothing, and says what to do.
    await page.goto("/login");
    await openSignUp(page);
    await page.getByLabel("First name").fill("Nia");
    await page.getByLabel("Last name").fill("Newman");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /already has an account\. Sign in, continue with Google, or reset your password/ })).toBeVisible();
    expect(await getOrCreateUserId(NEW_USER)).toBe(userId);

    // Resetting the password adds email sign-in to the same account.
    await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a reset link" }).click();
    await expect(page.getByText(/we sent it a link to reset the password/)).toBeVisible();
    await page.goto(await latestAuthLink(email));
    await expect(page).toHaveURL("/account/password");
    await page.getByLabel("New password").fill(PASSWORD);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL("/welcome");
    await page.getByRole("button", { name: /^Find a job/ }).click();
    await expect(page).toHaveURL("/profile");

    await context.clearCookies();
    await page.goto("/login");
    await expect(async () => {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(PASSWORD);
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled({ timeout: 1000 });
    }).toPass();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/profile");
    const { data } = await admin().auth.admin.getUserById(userId);
    expect(data.user?.identities?.map((i) => i.provider)).toEqual(["email"]);
    const { count } = await admin().from("profiles").select("*", { count: "exact", head: true }).eq("email", email);
    expect(count).toBe(1);
  });

  test("one account looks for jobs and hires, switching views from the nav", async ({ page, context }) => {
    const userId = await signIn(context, { user: BOTH });
    await seedCompleteCandidate(userId);
    const supabase = admin();
    await supabase.from("companies").delete().eq("domain", BOTH_DOMAIN);
    const { data: company, error } = await supabase
      .from("companies")
      .insert({ domain: BOTH_DOMAIN, name: "Both Co" })
      .select("id")
      .single();
    if (error) throw error;
    const member = await supabase.from("company_members").insert({ company_id: company.id, profile_id: userId, role: "owner" });
    if (member.error) throw member.error;

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Jobs for you" })).toBeVisible();
    await page.getByRole("button", { name: "Hire" }).click();
    await expect(page).toHaveURL("/employers");
    await expect(page.getByText("Hiring for Both Co")).toBeVisible();
    expect(await defaultView(userId)).toBe("employer");

    // Home now opens the hiring view; the candidate profile is still theirs.
    await page.goto("/");
    await expect(page).toHaveURL("/employers");
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();

    await page.goto("/employers");
    await page.getByRole("button", { name: "Find jobs" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Jobs for you" })).toBeVisible();
    expect(await defaultView(userId)).toBe("candidate");
    await supabase.from("companies").delete().eq("domain", BOTH_DOMAIN);
  });

  test("hiring view: home and /login open it, sign out returns to /login", async ({ page }) => {
    await resetEmployers();
    await openEmployerMagicLink(page, OWNER.email);
    await expect(page).toHaveURL("/employers");

    for (const path of ["/", "/login", "/employers/login"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/employers");
    }
    // Signed in, a link to sign in (e.g. from an invite email) opens its `next`, never /login again.
    await page.goto("/login?next=%2Femployers%2Fcompany");
    await expect(page).toHaveURL("/employers/company");
    await page.goto("/login?next=%2Flogin");
    await expect(page).toHaveURL("/employers");

    await signOutFromMenu(page);
    await expect(page).toHaveURL("/login");
    await page.goto("/employers");
    await expect(page).toHaveURL("/login?next=%2Femployers");
  });

  test("a job seeker without a company is asked to set one up to hire", async ({ page, context }) => {
    await signIn(context);
    await page.goto("/employers");
    await expect(page).toHaveURL("/employers/company/new");
  });
});
