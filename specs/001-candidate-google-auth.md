# 001 — Candidate Google sign-in

**Status:** done
**Created:** 2026-10-23

## Why
Candidates need a frictionless way to create an account and come back daily. Google sign-in
avoids passwords and gives us a verified email.

## What
On `/login`, a candidate clicks "Continue with Google", approves on Google's consent screen and
lands back in the app signed in. The first sign-in creates their candidate profile. They can sign
out. Signed-out visitors who open a candidate-only page are sent to `/login` first.

## Acceptance criteria
- [x] `/login` shows a "Continue with Google" button.
- [x] Clicking it opens Google's consent screen; on success the user returns to the app signed in.
- [x] The first sign-in creates exactly one `profiles` row with `type = candidate` and the name, email and avatar from Google.
- [x] Signing in again reuses the existing user and profile (no duplicates).
- [x] The session survives page reloads and browser restarts until the user signs out.
- [x] A signed-in user who visits `/login` is redirected to the app home.
- [x] A signed-out user who visits a protected candidate page is redirected to `/login`, and after sign-in lands on the page they originally asked for.
- [x] Signing out clears the session and returns the user to `/login`.
- [x] A cancelled consent or an OAuth error shows a readable message on `/login`.
- [x] `profiles` has Row Level Security on; a user can only read and update their own row.

## Out of scope
- LinkedIn sign-in and magic links.
- Employer sign-in (`/employers/login`), free-mail domain rejection, companies and vetting.
- UI for linking several identities to one account.
- Resume upload and candidate onboarding.
- Account deletion.

## Technical notes
- Supabase Auth via `@supabase/ssr`: a browser client for starting the OAuth flow and a server client for Server Components, Server Actions and route handlers.
- Session refresh and route protection run in Next 16's request interceptor. Check `node_modules/next/dist/docs/` first: middleware may be renamed (`proxy`) in this version.
- OAuth callback route `/auth/callback` exchanges the code for a session. It honours a `next` return path, restricted to same-origin relative paths (no open redirects).
- `profiles` table: id (= `auth.users.id`), type, full name, email, avatar URL, timestamps. Created with a Drizzle migration (`drizzle/`). The row is created in `/auth/callback` (not a database trigger), so the profile type can come from the sign-in page; if creation fails the user is signed out. A session without a profile (e.g. left over from an older app on the same project) is cleared via `/auth/signout` and the user is asked to sign in again.
- Google client id and secret live in the Supabase dashboard, not in the app. Redirect URLs for local, preview and production are added in Supabase Auth settings.
- Env keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`. Add `.env.example`.
- Open question: what happens to `type` when a user created via `/login` later signs in on the employer page. Deferred to the employer sign-in spec.

## Tasks
- [x] Install Supabase SSR, Drizzle and Postgres driver; add `.env.example`.
- [x] Supabase clients (browser, server, proxy session refresh).
- [x] `profiles` Drizzle schema with RLS policies; generate the SQL migration.
- [x] Proxy: refresh session, send signed-out users to `/login?next=…`, send signed-in users away from `/login`.
- [x] `/login` page with Google button and error message.
- [x] `/auth/callback` route: exchange code, create profile on first sign-in, safe `next` redirect, error redirect.
- [x] Server-side current-user helper that redirects to `/login` (pages don't rely on the proxy alone).
- [x] Signed-in home page showing the user, with a sign-out action.
- [x] Apply the migration to Supabase (via MCP, recorded in Drizzle's migrations table).
- [x] Confirm the Google provider and redirect URLs in the Supabase dashboard (manual).
- [x] Lint and build pass.
- [x] Manual sign-in / sign-out check with a real Google account.
