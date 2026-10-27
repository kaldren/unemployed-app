import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { EMPLOYER_COMPANY, EMPLOYER_DOMAIN, membership, openEmployerMagicLink, OWNER, resetEmployers, TEAMMATE } from "./support/employer";
import { admin, hasServiceRoleKey } from "./support/test-user";

test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

// Leave no unverified company behind for the other specs.
test.afterAll(async () => {
  await resetEmployers();
});

// The company `userId` belongs to (another company may claim the same domain).
async function companyId(userId: string) {
  const { data, error } = await admin().from("company_members").select("company_id").eq("profile_id", userId).single();
  if (error) throw error;
  return data.company_id as string;
}

// The link in the verification email, minted here since local email isn't delivered.
async function verificationLink(requestedBy: string) {
  const token = randomBytes(32).toString("base64url");
  const { error } = await admin()
    .from("company_domain_verifications")
    .insert({
      company_id: await companyId(requestedBy),
      email: OWNER.email,
      token_hash: createHash("sha256").update(token).digest("hex"),
      requested_by: requestedBy,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
  if (error) throw error;
  return `/auth/verify-domain?token=${token}`;
}

// Controlled fields lose input typed before hydration, so retry until the value sticks.
async function fill(page: Page, label: string, value: string) {
  await expect(async () => {
    await page.getByLabel(label, { exact: true }).fill(value);
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value, { timeout: 1000 });
  }).toPass();
}

test("a new employer creates a company and verifies its domain before publishing", async ({ page }) => {
  const [ownerId] = await resetEmployers({ withCompany: false });
  await openEmployerMagicLink(page, OWNER.email);
  await expect(page).toHaveURL("/employers/company/new");
  // A work address suggests its own domain.
  await expect(page.getByLabel("Domain")).toHaveValue(EMPLOYER_DOMAIN);

  await fill(page, "Domain", "gmail.com");
  await fill(page, "Company name", EMPLOYER_COMPANY);
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page.getByText("Use your company's own domain").first()).toBeVisible();

  await fill(page, "Domain", `https://www.${EMPLOYER_DOMAIN}/`);
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page).toHaveURL("/employers/company");
  await expect(page.getByRole("heading", { name: EMPLOYER_COMPANY, exact: true })).toBeVisible();
  await expect(page.getByText("Unverified")).toBeVisible();
  expect(await membership(ownerId!)).toMatchObject({ role: "owner", companies: { domain: EMPLOYER_DOMAIN, verified_at: null } });

  // Unverified companies can't publish, even straight in the database.
  const { error } = await admin()
    .from("jobs")
    .insert({ company_id: await companyId(ownerId!), created_by: ownerId, title: "Blocked", status: "open" });
  expect(error?.message).toContain("Only verified companies can publish jobs");
  await page.goto("/employers");
  await expect(page.getByText(`Verify ${EMPLOYER_DOMAIN} to publish jobs.`)).toBeVisible();
  await page.getByRole("link", { name: "Verify now" }).click();

  // The link goes only to an address on the domain.
  const verify = page.getByRole("region", { name: `Verify ${EMPLOYER_DOMAIN}` });
  await fill(page, `Email on ${EMPLOYER_DOMAIN}`, "someone@other.com");
  await verify.getByRole("button", { name: "Send verification link" }).click();
  await expect(verify.getByText(`Use an address ending in @${EMPLOYER_DOMAIN}`)).toBeVisible();
  await fill(page, `Email on ${EMPLOYER_DOMAIN}`, OWNER.email);
  await verify.getByRole("button", { name: "Send verification link" }).click();
  await expect(verify.getByText(`We sent a link to ${OWNER.email}`)).toBeVisible();

  const link = await verificationLink(ownerId!);
  await page.goto(link);
  await expect(page).toHaveURL("/employers/company?verify=verified");
  await expect(page.getByRole("alert").filter({ hasText: "Domain verified" })).toBeVisible();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
  expect(await membership(ownerId!)).toMatchObject({ companies: { verified_at: expect.any(String) } });

  // Links work once, but a spent link (e.g. opened first by a mail scanner) on a verified company says so.
  await page.goto(link);
  await expect(page).toHaveURL("/employers/company?verify=invalid");
  await expect(page.getByRole("alert").filter({ hasText: "Domain verified" })).toBeVisible();
  await page.goto("/auth/verify-domain?token=not-a-real-token");
  await expect(page).toHaveURL("/employers/company?verify=invalid");
});

test("a domain another company already verified can't be verified again", async ({ page }) => {
  const [ownerId] = await resetEmployers({ verified: false });
  // The other company proved the domain after this one claimed it.
  const { error } = await admin()
    .from("companies")
    .insert({ domain: EMPLOYER_DOMAIN, name: "Other", verified_at: new Date().toISOString() });
  if (error) throw error;
  await openEmployerMagicLink(page, OWNER.email);
  await page.goto(await verificationLink(ownerId!));
  await expect(page.getByRole("alert").filter({ hasText: "Another company already verified this domain" })).toBeVisible();
  await expect(page.getByText("Unverified")).toBeVisible();
});

test("owners invite teammates, who join and get their role changed or removed", async ({ page, browser }) => {
  const [, teammateId] = await resetEmployers();
  await openEmployerMagicLink(page, OWNER.email);
  await page.goto("/employers/company");

  await fill(page, "Company name", "Example Inc");
  await fill(page, "About the company", "We make examples.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Example Inc" })).toBeVisible();

  await fill(page, "Invite by email", TEAMMATE.email.toUpperCase());
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Invite sent")).toBeVisible();
  const invites = page.getByRole("list", { name: "Pending invites" });
  await expect(invites.getByText(TEAMMATE.email)).toBeVisible();
  await expect(invites.getByText("Recruiter")).toBeVisible();

  // The teammate signs in (any method) and accepts.
  const teammate = await (await browser.newContext()).newPage();
  await openEmployerMagicLink(teammate, TEAMMATE.email);
  await expect(teammate).toHaveURL("/employers/company/new");
  await teammate.getByRole("button", { name: "Join Example Inc" }).click();
  await expect(teammate).toHaveURL("/employers");
  expect(await membership(teammateId!)).toMatchObject({ role: "recruiter" });

  // Recruiters see the team but can't manage it or delete the company.
  await teammate.goto("/employers/company");
  await expect(teammate.getByRole("list", { name: "Members" }).getByText(OWNER.fullName)).toBeVisible();
  await expect(teammate.getByRole("button", { name: "Send invite" })).toBeHidden();
  await expect(teammate.getByRole("button", { name: "Delete company" })).toBeHidden();

  await page.reload();
  await expect(invites).toBeHidden();
  await page.getByLabel(`Role for ${TEAMMATE.fullName}`).selectOption("admin");
  await expect.poll(async () => (await membership(teammateId!))?.role).toBe("admin");

  // Admins can manage the team, but the owner's role is fixed.
  await teammate.reload();
  await expect(teammate.getByRole("button", { name: "Send invite" })).toBeVisible();
  await expect(teammate.getByLabel(`Role for ${OWNER.fullName}`)).toBeHidden();

  await page.getByRole("button", { name: `Remove ${TEAMMATE.fullName}` }).click();
  await expect(page.getByRole("list", { name: "Members" }).getByText(TEAMMATE.fullName)).toBeHidden();
  await teammate.goto("/employers");
  await expect(teammate).toHaveURL("/employers/company/new");
});

test("only the owner can delete the company", async ({ page }) => {
  await resetEmployers();
  await openEmployerMagicLink(page, OWNER.email);
  await page.goto("/employers/company");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete company" }).click();
  await expect(page).toHaveURL("/employers/company/new");
  const { count } = await admin().from("companies").select("*", { count: "exact", head: true }).eq("domain", EMPLOYER_DOMAIN);
  expect(count).toBe(0);
});
