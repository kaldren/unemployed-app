import { expect, test } from "@playwright/test";
import { listsSeedAdmin, SEED_ADMIN } from "../src/lib/seed/fixtures";
import { runSeed, type SeedAccount } from "../src/lib/seed/run";
import { seedCompleteCandidate } from "./support/candidate";
import { scorePair, topCard } from "./support/matching";
import { admin, hasServiceRoleKey, signIn } from "./support/test-user";

test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");

let accounts: SeedAccount[];
// Listed for the local database by scripts/db.mts; the hosted project doesn't list it.
const withAdmin = listsSeedAdmin();

test.beforeAll(async ({}, testInfo) => {
  accounts = await runSeed({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    baseUrl: testInfo.project.use.baseURL!,
    withAdmin,
  });
});

const account = (email: string) => accounts.find((a) => a.email === email)!;

test("a seeded candidate signs in from the report and has jobs and a match", async ({ page }) => {
  await page.goto(account("ana.petrova@seed.test").signInUrl);
  await expect(page).toHaveURL("/");
  await expect(topCard(page)).toHaveAccessibleName("Full-stack Engineer at Copperleaf Retail");

  await page.goto("/matches");
  await expect(page.getByRole("list", { name: "Matches" }).getByRole("listitem")).toContainText("Senior Backend Engineer");
});

test("a seeded employer signs in from the report and has candidates", async ({ page }) => {
  await page.goto(account("olivia@northwind.seed.test").signInUrl);
  await expect(page).toHaveURL("/employers");
  await expect(page.getByText("Frontend Engineer", { exact: true })).toBeVisible();

  await page.goto("/employers/matches");
  await expect(page.getByRole("list", { name: "Matches" }).getByRole("listitem")).toContainText("Ana Petrova");
});

test("the seeded admin signs in from the report and sees the company to review", async ({ page }) => {
  test.skip(!withAdmin, "Only the local database lists the seeded admin");
  await page.goto(account(SEED_ADMIN.email).signInUrl);
  await expect(page).toHaveURL("/admin");
  await expect(page.getByRole("region", { name: "quickcash.seed.test" })).toBeVisible();
});

test("real candidates never see seeded jobs, even when scored", async ({ context, page }) => {
  const candidateId = await signIn(context);
  await seedCompleteCandidate(candidateId);
  const { data: job, error } = await admin()
    .from("jobs")
    .select("id, companies!inner(domain)")
    .eq("title", "Full-stack Engineer")
    .eq("companies.domain", "copperleaf.seed.test")
    .single();
  if (error) throw error;
  await scorePair(job.id, candidateId, 100);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Jobs for you" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Full-stack Engineer at Copperleaf Retail" })).toHaveCount(0);
});
