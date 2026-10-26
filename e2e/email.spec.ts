import { expect, test } from "@playwright/test";
import { seedCompleteCandidate } from "./support/candidate";
import { admin, hasServiceRoleKey, signIn } from "./support/test-user";

test("the daily digest only runs with the cron secret", async ({ request }) => {
  expect((await request.get("/api/cron/digest")).status()).toBe(401);
  expect((await request.get("/api/cron/digest", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  const response = await request.get("/api/cron/digest", {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toHaveProperty("sent");
});

test("a candidate turns the daily email off", async ({ page, context }) => {
  test.skip(!hasServiceRoleKey, "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run signed-in tests");
  const userId = await signIn(context);
  await seedCompleteCandidate(userId);

  await page.goto("/profile");
  await page.getByRole("tab", { name: "Account" }).click();
  const digest = page.getByRole("checkbox", { name: "Email me once a day when new jobs match me" });
  await expect(digest).toBeChecked();
  await digest.click();
  await page.locator("#email").getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#email").getByText("Saved")).toBeVisible();

  const { data } = await admin().from("candidate_profiles").select("email_digest").eq("profile_id", userId).single();
  expect(data?.email_digest).toBe(false);
});
