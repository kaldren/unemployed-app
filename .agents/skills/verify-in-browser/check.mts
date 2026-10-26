// Opens routes in headless Chromium, screenshots each, and reports errors.
// Usage: node .claude/skills/verify-in-browser/check.mts [--auth] [--out <dir>] [--mobile] <route>...
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "@playwright/test";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseURL = "http://localhost:3000";
const args = process.argv.slice(2);
const auth = args.includes("--auth");
const mobile = args.includes("--mobile");
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1] : "test-results/verify";
const routes = args.filter((a, i) => !a.startsWith("--") && (outIndex < 0 || i !== outIndex + 1));
if (routes.length === 0) routes.push("/");

mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...(mobile ? devices["iPhone 13"] : devices["Desktop Chrome"]),
  baseURL,
});
if (auth) {
  // Imported after loading env: test-user.ts reads it at module load.
  const { hasServiceRoleKey, signIn } = await import("../../../e2e/support/test-user.ts");
  if (!hasServiceRoleKey) {
    console.error("--auth needs SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(2);
  }
  await signIn(context);
}

let failed = false;
for (const route of routes) {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().split("\n")[0]}`));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const response = await page.goto(route, { waitUntil: "networkidle" });
  const status = response?.status() ?? 0;

  // Next dev overlay badge ("1 Issue") lives in an open shadow root under <nextjs-portal>.
  const badge = page.locator("nextjs-portal").getByText(/^\d+ Issues?$/);
  const issues = (await badge.count()) ? await badge.first().textContent() : null;
  if (issues) {
    await badge.first().click();
    const dialog = page.locator("nextjs-portal [role=dialog]");
    await dialog.waitFor({ timeout: 3000 }).catch(() => {});
    if (await dialog.count()) errors.push(`overlay: ${(await dialog.first().innerText()).slice(0, 1500)}`);
    await page.keyboard.press("Escape");
  }

  const file = join(out, `${route.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "") || "root"}.png`);
  await page.screenshot({ path: file, fullPage: true });

  const ok = status < 400 && errors.length === 0;
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"} ${route} -> ${page.url().replace(baseURL, "")} [${status}]${issues ? ` (${issues})` : ""}`);
  console.log(`  screenshot: ${file}`);
  for (const e of errors) console.log(`  ${e.replace(/\n/g, "\n    ")}`);
  await page.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
