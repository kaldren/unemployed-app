import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "./support/admin-user";
import { EMPLOYER_DOMAIN, membership, openEmployerMagicLink, OWNER, resetEmployers } from "./support/employer";
import { admin as supabase, hasServiceRoleKey, signIn } from "./support/test-user";

test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

test("only admins can open the admin page", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/admin");
  // The page streams, so the status is already 200 when notFound() runs; check what renders.
  await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Companies" })).toBeHidden();
});

test("an admin approves a company, and its employer is told it's verified", async ({ browser }) => {
  const [ownerId] = await resetEmployers();
  const employer = await (await browser.newContext()).newPage();
  await openEmployerMagicLink(employer, OWNER.email);
  await expect(employer).toHaveURL("/employers");
  await expect(employer.getByText("We're verifying your company.", { exact: false })).toBeVisible();

  const adminContext = await browser.newContext();
  await signIn(adminContext, { user: E2E_ADMIN });
  const admin = await adminContext.newPage();
  await admin.goto("/admin");
  const card = admin.getByRole("region", { name: EMPLOYER_DOMAIN });
  await expect(card.getByText("Pending")).toBeVisible();
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(card).toBeHidden();

  expect(await membership(ownerId!)).toMatchObject({ companies: { status: "approved" } });
  await employer.reload();
  await expect(employer.getByText("We're verifying your company.", { exact: false })).toBeHidden();

  // Rejecting tells the employer too.
  await supabase().from("companies").update({ status: "pending" }).eq("domain", EMPLOYER_DOMAIN);
  await admin.reload();
  await card.getByRole("button", { name: "Reject" }).click();
  await expect(card.getByText("Rejected")).toBeVisible();
  await employer.reload();
  await expect(employer.getByText("We couldn't verify your company", { exact: false })).toBeVisible();
});
