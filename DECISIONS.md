# Decisions

Choices Claude made without asking, newest first. One line each: date, decision, why.
Overrule any of them by saying so; Claude then updates the code and this log.

- 2026-10-24 — Resume import hidden: profile tab, its component and e2e tests removed; `importResume`, `lib/resume/extract.ts`, the `resumes` bucket and `resume_*` columns kept so it can return by reverting commit 16a8712 (restores `resume-import.tsx`, the tab wiring in `profile/page.tsx` and the `key={version}` remount after an import) and flipping `RESUME_IMPORT_ENABLED` in `profile/actions.ts`, which refuses the action meanwhile.
- 2026-10-24 — Minimal UI: shared `AppHeader` replaces in-page Home/Sign out; login and home drop their cards; profile nav drops group labels (except "Optional"), meta lines and the "Still missing" list — status dots already show what's missing.
- 2026-10-24 — CI runs lint, typecheck, unit tests and build, not e2e — e2e needs Supabase secrets in GitHub.
