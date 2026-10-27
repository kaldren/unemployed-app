# Tech stack

What we use for the MVP and why. One developer, managed services, as few vendors as possible.
If something isn't on this page, we don't need it yet. See [Not in the MVP](#not-in-the-mvp).

## Principles

- **Managed services only.** No servers, containers or infrastructure code to run.
- **One repo, one deploy.** The Next.js app is both the frontend and the backend.
- **Fewest vendors.** Supabase covers the database, auth, file storage and realtime.
- **Free tiers first.** Upgrade a service only when we hit its limits.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Server Actions) + TypeScript (strict) | Frontend and backend in one deployable app, no separate API |
| UI | Tailwind CSS 4 + shadcn/ui | Components are copied into the repo, so there's no lock-in. Rules in [DESIGNSYSTEM.md](DESIGNSYSTEM.md) |
| Validation | Zod | One schema for forms, server actions and Claude's structured output |
| Hosting | Vercel | Zero-config Next.js, a preview deploy for every PR |
| Database | Supabase Postgres + pgvector | Managed Postgres, with vectors in the same database |
| ORM / migrations | Drizzle + drizzle-kit | Typed queries and SQL migrations, used only on the server |
| Auth | Supabase Auth (`@supabase/ssr`) | Google, LinkedIn and magic links built in. Users live in our own Postgres |
| File storage | Supabase Storage (private bucket) | Resume PDFs, served with short-lived signed URLs |
| Realtime | Supabase Realtime | Chat after a match, with no extra vendor |
| Background jobs | Inngest | Daily matching run, company vetting, retries, local dev server |
| AI | Claude API: Haiku 5.5 for extraction and vetting, Sonnet 5.5 for match scoring | Reads PDFs directly, returns structured output |
| Embeddings | Voyage AI → pgvector | A cheap pre-filter, so Claude only scores the most promising pairs |
| Email | Resend + React Email | Magic links (as Supabase Auth's SMTP), daily matches, "It's a match" |
| Errors | Sentry (free tier) | The only monitoring we need at launch |
| Tests | Vitest (unit), Playwright (e2e) | |

**Data access rule:** the browser never queries tables directly. All reads and writes go through
Server Components and Server Actions using Drizzle. Row Level Security is still on for every table,
as a safety net. The only client-side Supabase use is auth and the Realtime chat subscription.

## Authentication

There are two kinds of users with two separate sign-in pages. A `profiles` row is created on first
sign-in, and its `type` (`candidate` | `employer`) comes from the page the user signed in on.

### Candidates: `/login`

- Social sign-in only, with **Google** or **LinkedIn** (OpenID Connect, `linkedin_oidc` in Supabase).
- LinkedIn only gives us name, email and photo, not work history. The **uploaded resume** is still
  the source of the profile.
- Identities with the same verified email are linked to one user.

### Employers: `/employers/login`

A company is an organization, not a person, so publishing needs proof that someone works there.

1. **Any email signs up**, personal or work: **Google**, or **email + password** (Supabase confirms the
   email; "Forgot password?" emails a reset link). The same email reaches one account whichever
   method is used (Supabase links identities with the same verified email; a reset adds a password
   to a Google-only account).
2. **An employer creates a company** (`companies`: name, domain, website, logo link, description) and
   becomes its `owner` in `company_members` (`owner | admin | recruiter`). Owners and admins invite
   teammates by email (`company_invites`) and change roles; only the owner deletes the company. The
   app shows one company per employer.
3. **Domain verification.** A company is unverified until a member opens a one-time link (24 h, hash
   stored in `company_domain_verifications`) sent to an address on its domain; that sets
   `verified_at`. Free-mail domains can't be claimed. Only one company can verify a domain.
   **Only verified companies publish jobs** (server check plus a database trigger).
4. **AI vetting.** Creating a company also starts vetting: the server fetches the domain's homepage
   and Claude returns `approve | reject | needs_review` with a reason, both stored.
5. **A human checks only when needed.** Companies marked `needs_review` or `reject` appear in
   `/admin` (admins are user ids in an env var). Candidates see a company's jobs only when it is
   verified **and** `approved`.
6. **The domain also protects candidates.** A candidate lists their current employer's domain, and
   companies with that domain never see them in matches.

## Data and AI pipeline

1. **Resume → profile.** The candidate uploads a PDF to Storage. Claude (Haiku) extracts a structured
   profile (validated with Zod), and the candidate reviews and edits it.
2. **Job → requirements.** The employer writes a job post. Claude extracts the requirements, and the
   employer confirms which ones are must-haves.
3. **Embeddings.** Profiles and jobs are embedded with Voyage AI and stored in pgvector columns.
4. **Nightly matching (Inngest cron).** For each open job:
   - Hard filters in SQL: location, remote, salary range, blocked employer domains, already-seen pairs.
   - pgvector similarity picks the top N candidates.
   - Claude (Sonnet) scores each pair against the must-haves and returns a score and a short reason.
   - Pairs above the threshold become `matches` rows. **Every score, reason and model id is stored**,
     so any decision can be audited.
5. **Delivery.** Candidates see new matches the next day and get one digest email. When both sides
   like each other, both get an email and a chat opens (Supabase Realtime).

## Environments

| Env | Database / auth | Jobs | Notes |
|---|---|---|---|
| Local | Supabase CLI on OrbStack, started by `pnpm dev` (`pnpm db:use remote` to switch) | `pnpm inngest:dev` | Seed script with fake candidates and jobs |
| Preview | Shared Supabase "staging" project | Inngest branch environment | One Vercel preview per PR |
| Production | Supabase production project | Inngest production | Vercel production |

Keys for `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                 # Supabase pooled connection string, used by Drizzle
ANTHROPIC_API_KEY=
JOB_DRAFT_MODEL=              # optional, defaults to claude-haiku-5-5
MATCH_MODEL=                  # optional, defaults to claude-sonnet-5-5
VOYAGE_API_KEY=
RESEND_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
SENTRY_DSN=
ADMIN_USER_IDS=               # comma-separated Supabase user ids
```

Google and LinkedIn OAuth client ids and secrets go in the Supabase dashboard, not in the app.

## Rough monthly cost

| Stage | Cost |
|---|---|
| Building / private beta | ~$0 on free tiers, plus AI usage |
| Public launch | Supabase Pro ~$25 + Vercel Pro ~$20 + AI usage |

AI usage grows with *jobs × candidates* scored each night. The pgvector pre-filter (top N per job)
is what keeps this cost under control, so check it before raising N. Prices are approximate.
Check the vendors' current pricing pages.

## Not in the MVP

| Not now | Add when |
|---|---|
| Payments (Stripe) | We start charging employers |
| Facebook / Microsoft login, passwords for candidates | Users ask for them or sign-up drop-off shows they're needed |
| Enterprise SSO (SAML) | A large customer requires it |
| Redis / caching layer | Postgres queries become a measured bottleneck |
| Search engine (Algolia, Typesense) | We need free-text search, which matching doesn't |
| Product analytics (PostHog) | We have enough traffic to learn from funnels |
| Feature flags | We need gradual rollouts |
| i18n | We launch outside the first market |
| Mobile app | The responsive web app isn't enough |
| Docker / IaC / separate backend | Something can't run on Vercel + Supabase + Inngest |
| Supabase Edge Functions | Never planned. Server code lives in Next.js and Inngest |
