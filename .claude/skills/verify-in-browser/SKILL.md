---
name: verify-in-browser
description: Check UI changes in a real browser yourself (headless Chromium via Playwright) instead of asking the user to look. Use after any change to pages, components, styles, routing, auth redirects, or when the user asks to test, screenshot, or check the app. Screenshots routes signed out or signed in, and reports console errors and Next dev overlay issues.
---

# Verify in browser

Never ask the user to check something by hand. Run the check, look at the screenshots, report.

## 1. Dev server

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
```

- If you get a status code, reuse that server. Don't start a second one.
- If the connection fails, start `pnpm dev` with `run_in_background`, then poll the curl until it returns a status.

## 2. Run the check

```bash
node .claude/skills/verify-in-browser/check.mts [--auth] [--mobile] [--out <dir>] <route>...
```

- `--auth`: signs in as the e2e test user (`e2e/support/test-user.ts`, a Supabase admin-minted session). Needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. If it's missing, the script exits with code 2. Tell the user, and don't fake the signed-in check.
- `--mobile`: uses an iPhone 13 viewport. Use it for layout changes.
- `--out`: sets the screenshot directory. Default: `test-results/verify/` (gitignored).
- Routes may include a query string, e.g. `/login?error=cancelled`.

The script prints one block per route:

```
PASS|FAIL <route> -> <final url> [<status>] (<overlay badge>)
  screenshot: <path>
  console: / pageerror: / overlay: <details>
```

A route fails on HTTP >= 400, a console error, an uncaught exception, or a Next dev overlay issue. The script exits 1 if any route fails.

## 3. Look and report

- Read every screenshot with the Read tool. A PASS only means no errors. You still have to confirm the change looks right.
- Check that the redirect target in `-> <final url>` is the one you expect.
- For interactions such as clicking or filling forms, write a one-off Playwright script in the scratchpad that follows `check.mts`. For flows worth keeping, add a test to `e2e/` and run `pnpm test:e2e`.
- Report one line per route: PASS/FAIL, what you saw, and the screenshot path. Show the overlay text on failures.

## Known

- `/login` currently shows an overlay issue: "Could not validate `instant`…" at `src/app/login/page.tsx:38`. It predates this skill. Don't blame your change for it, and remove this note once it's fixed.
