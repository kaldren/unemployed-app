---
name: ship
description: Take a feature request from description to merged on main with no check-ins. Use when the user describes a feature, fix or change to build, or types /ship <feature>.
---

# Ship

The user gives a feature. You deliver it merged and pushed. Ask only per "When to ask" in AGENTS.md.

1. **Branch.** `git checkout main && git pull && git checkout -b feature/<slug>` (or `fix/<slug>`).
2. **Understand.** Read AGENTS.md, TECH.md, DESIGNSYSTEM.md and the code you'll touch. For Next.js APIs read `node_modules/next/dist/docs/`. For schema work load the Supabase skills.
3. **Decide.** Resolve ambiguity yourself from the docs and existing patterns. Log non-obvious choices in DECISIONS.md.
4. **Build.** Implement in small commits. Add Vitest tests for logic (`*.test.ts` next to the file) and Playwright tests in `e2e/` for user-facing flows.
5. **Gate.** `pnpm check` must pass. Fix failures; don't skip or weaken tests.
6. **See it.** For UI changes run the `verify-in-browser` skill and look at the screenshots (desktop and `--mobile`).
7. **Review.** Run `/code-review --fix` on the branch diff, then re-run `pnpm check`.
8. **Merge.** `git checkout main && git merge --no-ff feature/<slug> && git push`, push the branch too.
9. **CI.** `gh run watch` on the main run. If it fails, fix on a new branch and repeat 5–8.
10. **Report.** 3–5 lines: what shipped, decisions made, anything the user must do (e.g. env vars).
