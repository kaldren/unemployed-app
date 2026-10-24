# Decisions

Choices Claude made without asking, newest first. One line each: date, decision, why.
Overrule any of them by saying so; Claude then updates the code and this log.

- 2026-10-24 — Employer auth: magic link + Google on `/employers/login`; `?portal=employer` on `/auth/callback` picks the profile type. Free-mail check uses `free-email-domains` (also covers disposable domains). Company name starts as the domain's first label ("acme-labs.com" → "Acme Labs"); subdomains are separate companies for now. New companies are `pending` until vetting exists.
- 2026-10-24 — Profile type is fixed at first sign-in: a candidate account signing in on the employer page is refused (`candidate_account`); an employer on `/login` is let in and sent to `/employers`.
- 2026-10-24 — `/auth/callback` also accepts `token_hash` + `type`, so the magic-link email template can point at it directly (works across browsers; the default PKCE link must be opened in the same browser). e2e uses it too.
- 2026-10-24 — Resume import hidden: profile tab, its component and e2e tests removed; `importResume`, `lib/resume/extract.ts`, the `resumes` bucket and `resume_*` columns kept so it can return by reverting commit 16a8712 (restores `resume-import.tsx`, the tab wiring in `profile/page.tsx` and the `key={version}` remount after an import) and flipping `RESUME_IMPORT_ENABLED` in `profile/actions.ts`, which refuses the action meanwhile.
- 2026-10-24 — Minimal UI: shared `AppHeader` replaces in-page Home/Sign out; login and home drop their cards; profile nav drops group labels (except "Optional"), meta lines and the "Still missing" list — status dots already show what's missing.
- 2026-10-24 — CI runs lint, typecheck, unit tests and build, not e2e — e2e needs Supabase secrets in GitHub.
