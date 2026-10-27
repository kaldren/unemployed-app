# unemployed-app

A hiring platform where **both sides have to say yes**, like a dating app for jobs.

## The problem

On LinkedIn, a job post gets hundreds of applicants within hours, and most of them aren't
qualified. Employers drown in applications, and candidates send dozens of applications
that nobody reads.

## How it works

1. **Candidates build a profile** from their resume. They set their preferences (location,
   salary, remote work) and can hide their profile from their current employer.
2. **Employers post a job** and confirm its must-have requirements.
3. **AI checks every candidate↔job pair** and keeps only the ones that really fit. Each
   pair it keeps comes with a score and a short explanation of _why_ it fits.
4. **Candidates get new matches every day.** They like a job (this is applying) or pass.
   They can't apply to a job the AI didn't match them to.
5. **Employers see the same matched candidates** for each job, on anonymous cards with no
   name, photo or current employer. They like or pass too.
6. **It's a match only when both sides like each other.** Then the employer sees the full
   profile, a chat opens, and the candidate enters the hiring pipeline.

Neither side ever learns about the other's passes, or about a like that wasn't returned.

## Why it's better

- **Employers only review qualified people.** There's no flood of applicants.
- **Candidates have a reason to come back daily:** new matches arrive every day.
- **No wasted effort.** A conversation starts only after both sides have said yes.
- **Safe for people who already have a job:** cards stay anonymous until a match, and
  their current employer never sees them.
- **A human makes every hiring decision.** The AI only checks, ranks and explains the
  matches, and every score is stored so it can be audited.

## Stack

Next.js · TypeScript · Tailwind + shadcn/ui · Vercel · Supabase (Postgres + pgvector, Auth,
Storage, Realtime) · Drizzle · Inngest · Claude API · Voyage AI embeddings · Resend · Sentry ·
Vitest · Playwright

See [TECH.md](TECH.md) for why we chose each one, how authentication works, and what's left out
of the MVP.

## Getting started

Requires Node 24+, pnpm, [OrbStack](https://orbstack.dev) and the Supabase CLI
(`brew install orbstack supabase/tap/supabase`). `pnpm install`, copy `.env.example` to `.env.local`,
then `pnpm dev`.

`pnpm dev` runs against a **local Supabase stack** (Postgres, Auth, Storage) in OrbStack containers:
it starts them if needed, applies the migrations and writes `.env.development.local`, which overrides
the Supabase settings in `.env.local`. Studio is at http://127.0.0.1:55323 and sign-in emails land in
Mailpit at http://127.0.0.1:55324. `pnpm db:use remote` switches to the hosted project in `.env.local`
(`pnpm db:use local` switches back); `pnpm db:migrate` and `pnpm test:e2e` follow the same switch.
`pnpm db:reset` wipes the local database, `pnpm db:stop` stops the containers.

`pnpm dev` also re-seeds dummy candidates, companies, jobs and an admin (all under `*.seed.test`)
and prints a one-time sign-in link for each account, also saved to `.seed-accounts.md`. Links expire
after an hour; `pnpm seed` makes fresh ones without restarting. Google and LinkedIn sign-in aren't set
up locally; use the seed links.

## Employer sign-in setup (hosted)

Local dev needs none of this (email/password works; Mailpit at http://127.0.0.1:55324 catches auth email).

1. **Google Cloud** → APIs & Services → Credentials → OAuth client ID (Web). Authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`. Consent screen: app name, support email, your domain.
2. **Supabase → Auth → Providers → Google**: enable, paste the client ID and secret.
3. **Supabase → Auth → Providers → Email**: enable, "Confirm email" on, minimum password length 8.
4. **Supabase → Auth → URL Configuration**: Site URL = production URL; redirect URLs =
   `https://<prod-domain>/auth/callback` and `https://*-<team>.vercel.app/auth/callback` for previews.
5. **Supabase → Auth → SMTP**: use Resend (the built-in sender is rate-limited and not for production).
6. **Vercel env**: `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` (domain-verification and invite
   emails are skipped without them).
7. Run the migration on the hosted DB: `pnpm db:use remote && pnpm db:migrate`.
