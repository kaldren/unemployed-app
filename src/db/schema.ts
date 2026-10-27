import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole, authUsers } from "drizzle-orm/supabase";

// Which dashboard a user lands on: finding a job or hiring. Any user can do both; this only picks the
// landing page and the nav's current view. Null until they answer the first-sign-in question.
export const appView = pgEnum("app_view", ["candidate", "employer"]);
export type AppView = (typeof appView.enumValues)[number];

const isOwner = sql`(select auth.uid()) = id`;

// One row per auth user, created on first sign-in. Inserts happen server-side only.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid()
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    defaultView: appView("default_view"),
    // Asked at sign-up (Google gives them too). `full_name` is kept as "First Last" for display and matching.
    firstName: text("first_name"),
    lastName: text("last_name"),
    fullName: text("full_name"),
    email: text().notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [
    pgPolicy("Users can read their own profile", {
      for: "select",
      to: authenticatedRole,
      using: isOwner,
    }),
    pgPolicy("Users can update their own profile", {
      for: "update",
      to: authenticatedRole,
      using: isOwner,
      withCheck: isOwner,
    }),
  ],
).enableRLS();

export type Profile = typeof profiles.$inferSelect;

// ---------- Candidate profile ----------

export const jobSearchStatus = pgEnum("job_search_status", [
  "actively_looking",
  "open_to_offers",
  "not_looking",
]);
export const availability = pgEnum("availability", [
  "immediately",
  "2_weeks",
  "1_month",
  "2_months",
  "3_months_plus",
]);
export const seniority = pgEnum("seniority", [
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
  "executive",
]);
export const workMode = pgEnum("work_mode", ["onsite", "hybrid", "remote"]);
export const employmentType = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "internship",
]);
export const skillLevel = pgEnum("skill_level", ["beginner", "intermediate", "advanced", "expert"]);
export const languageProficiency = pgEnum("language_proficiency", [
  "basic",
  "conversational",
  "professional",
  "native",
]);

const ownsRow = sql`(select auth.uid()) = profile_id`;

// Candidate tables are written only by server actions (Drizzle). RLS lets a user read their own rows.
function ownerCanRead(table: string) {
  return pgPolicy(`Candidates can read their own ${table}`, {
    for: "select",
    to: authenticatedRole,
    using: ownsRow,
  });
}

const profileId = () =>
  uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" });

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const candidateProfiles = pgTable(
  "candidate_profiles",
  {
    profileId: profileId().primaryKey(),
    headline: text(),
    about: text(),
    locationCity: text("location_city"),
    locationCountry: text("location_country"), // ISO 3166-1 alpha-2
    openToRelocation: boolean("open_to_relocation").notNull().default(false),
    jobSearchStatus: jobSearchStatus("job_search_status"),
    availableFrom: availability("available_from"),
    seniority: seniority(),
    workModes: workMode("work_modes").array().notNull().default(sql`'{}'`),
    employmentTypes: employmentType("employment_types").array().notNull().default(sql`'{}'`),
    salaryMin: integer("salary_min"), // annual, gross
    salaryCurrency: text("salary_currency"), // ISO 4217
    workAuthorization: text("work_authorization"),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    portfolioUrl: text("portfolio_url"),
    // Companies with these domains never see this candidate.
    hiddenCompanyDomains: text("hidden_company_domains").array().notNull().default(sql`'{}'`),
    // Graduates can be complete without any work experience.
    noExperience: boolean("no_experience").notNull().default(false),
    resumePath: text("resume_path"),
    resumeUploadedAt: timestamp("resume_uploaded_at", { withTimezone: true }),
    // Last time the AI looked for jobs for this candidate.
    matchedAt: timestamp("matched_at", { withTimezone: true }),
    // The daily email about new matches: whether they want it, and when it last went out.
    emailDigest: boolean("email_digest").notNull().default(true),
    digestSentAt: timestamp("digest_sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("about_length", sql`char_length(${t.about}) <= 2000`), // keep in sync with ABOUT_MAX
    check("salary_min_positive", sql`${t.salaryMin} >= 0`),
    ownerCanRead("candidate profile"),
  ],
).enableRLS();

export const experiences = pgTable(
  "experiences",
  {
    id: uuid().primaryKey().defaultRandom(),
    profileId: profileId(),
    companyName: text("company_name").notNull(),
    companyDomain: text("company_domain"),
    title: text().notNull(),
    employmentType: employmentType("employment_type"),
    location: text(),
    isRemote: boolean("is_remote").notNull().default(false),
    startDate: date("start_date").notNull(), // first of the month
    endDate: date("end_date"), // null = current job
    description: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("experiences_profile_id_idx").on(t.profileId),
    check("experience_dates", sql`${t.endDate} is null or ${t.endDate} >= ${t.startDate}`),
    ownerCanRead("experiences"),
  ],
).enableRLS();

export const educations = pgTable(
  "educations",
  {
    id: uuid().primaryKey().defaultRandom(),
    profileId: profileId(),
    institution: text().notNull(),
    degree: text(),
    fieldOfStudy: text("field_of_study"),
    startYear: smallint("start_year"),
    endYear: smallint("end_year"),
    createdAt: createdAt(),
  },
  (t) => [
    index("educations_profile_id_idx").on(t.profileId),
    check("education_years", sql`${t.endYear} is null or ${t.startYear} is null or ${t.endYear} >= ${t.startYear}`),
    ownerCanRead("educations"),
  ],
).enableRLS();

export const certifications = pgTable(
  "certifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    profileId: profileId(),
    name: text().notNull(),
    issuer: text(),
    year: smallint(),
    createdAt: createdAt(),
  },
  (t) => [index("certifications_profile_id_idx").on(t.profileId), ownerCanRead("certifications")],
).enableRLS();

export const candidateLanguages = pgTable(
  "candidate_languages",
  {
    profileId: profileId(),
    languageCode: text("language_code").notNull(), // ISO 639-1
    proficiency: languageProficiency().notNull(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.languageCode] }), ownerCanRead("languages")],
).enableRLS();

// Shared catalogs. Candidates add new entries by typing them; the slug keeps "React.js" and "react js" as one.
const catalogReadable = (name: string) =>
  pgPolicy(`Signed-in users can read ${name}`, { for: "select", to: authenticatedRole, using: sql`true` });

export const skills = pgTable(
  "skills",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    createdAt: createdAt(),
  },
  () => [catalogReadable("skills")],
).enableRLS();

export const roles = pgTable(
  "roles",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    createdAt: createdAt(),
  },
  () => [catalogReadable("roles")],
).enableRLS();

export const candidateSkills = pgTable(
  "candidate_skills",
  {
    profileId: profileId(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: skillLevel(),
    years: smallint(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.skillId] }),
    index("candidate_skills_skill_id_idx").on(t.skillId),
    ownerCanRead("skills"),
  ],
).enableRLS();

export const candidateRoles = pgTable(
  "candidate_roles",
  {
    profileId: profileId(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.roleId] }),
    index("candidate_roles_role_id_idx").on(t.roleId),
    ownerCanRead("roles"),
  ],
).enableRLS();

// ---------- Companies ----------

// `pending` until vetted by AI (or an admin); candidates see jobs only from `approved`, verified companies.
export const companyStatus = pgEnum("company_status", ["pending", "approved", "needs_review", "rejected"]);
export const companyRole = pgEnum("company_role", ["owner", "admin", "recruiter"]);
export type CompanyRole = (typeof companyRole.enumValues)[number];

// Policy helpers, defined in drizzle/0015 as security definer functions in the unexposed `private`
// schema, so company_members policies can read company_members without recursing.
const hasCompanyRole = (companyId: SQL, roles: CompanyRole[]) =>
  sql`private.has_company_role(${companyId}, ${sql.raw(`'{${roles.join(",")}}'`)}::public.company_role[])`;
const isCompanyAdmin = (companyId: SQL) => hasCompanyRole(companyId, ["owner", "admin"]);

// A signed-in employer creates a company and becomes its owner. It's unverified until a member
// confirms an email on its domain (company_domain_verifications); only verified companies publish jobs.
// Written only by the server (Drizzle); RLS is the safety net. Profiles are public.
export const companies = pgTable(
  "companies",
  {
    id: uuid().primaryKey().defaultRandom(),
    domain: text().notNull(), // lowercase, e.g. "acme.com"
    name: text().notNull(),
    website: text(),
    logoUrl: text("logo_url"),
    description: text(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    status: companyStatus().notNull().default("pending"),
    // What the AI vetting said, kept so an admin can see why. Null until vetted.
    vettingReason: text("vetting_reason"),
    vettingModel: text("vetting_model"),
    vettedAt: timestamp("vetted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("domain_lowercase", sql`${t.domain} = lower(${t.domain})`),
    // Anyone may claim a domain, but only one company can prove it.
    uniqueIndex("companies_verified_domain_unique").on(t.domain).where(sql`${t.verifiedAt} is not null`),
    pgPolicy("Company profiles are public", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
    pgPolicy("Owners and admins can update their company", {
      for: "update",
      to: authenticatedRole,
      using: isCompanyAdmin(sql`${t.id}`),
      withCheck: isCompanyAdmin(sql`${t.id}`),
    }),
    pgPolicy("Owners can delete their company", {
      for: "delete",
      to: authenticatedRole,
      using: hasCompanyRole(sql`${t.id}`, ["owner"]),
    }),
  ],
).enableRLS();

// One row per (company, user). Each company has exactly one owner, set when it's created.
export const companyMembers = pgTable(
  "company_members",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    profileId: profileId(),
    role: companyRole().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.profileId] }),
    index("company_members_profile_id_idx").on(t.profileId),
    pgPolicy("Members can read their teammates", {
      for: "select",
      to: authenticatedRole,
      using: hasCompanyRole(sql`${t.companyId}`, ["owner", "admin", "recruiter"]),
    }),
    // Owners and admins manage everyone but the owner, and can't make anyone owner.
    pgPolicy("Owners and admins can add members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isCompanyAdmin(sql`${t.companyId}`)} and ${t.role} <> 'owner'`,
    }),
    pgPolicy("Owners and admins can change roles", {
      for: "update",
      to: authenticatedRole,
      using: sql`${isCompanyAdmin(sql`${t.companyId}`)} and ${t.role} <> 'owner'`,
      withCheck: sql`${isCompanyAdmin(sql`${t.companyId}`)} and ${t.role} <> 'owner'`,
    }),
    pgPolicy("Owners and admins can remove members", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${isCompanyAdmin(sql`${t.companyId}`)} and ${t.role} <> 'owner'`,
    }),
  ],
).enableRLS();

// A pending invitation by email. The invitee accepts it once signed in with that (confirmed) email.
export const companyInvites = pgTable(
  "company_invites",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    email: text().notNull(),
    role: companyRole().notNull(),
    invitedBy: uuid("invited_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("company_invites_company_email_unique").on(t.companyId, t.email),
    index("company_invites_email_idx").on(t.email),
    check("company_invite_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("company_invite_not_owner", sql`${t.role} <> 'owner'`),
    pgPolicy("Owners and admins manage invites", {
      for: "all",
      to: authenticatedRole,
      using: isCompanyAdmin(sql`${t.companyId}`),
      withCheck: isCompanyAdmin(sql`${t.companyId}`),
    }),
    pgPolicy("Invitees can read their invites", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.email} = lower((select auth.jwt() ->> 'email'))`,
    }),
  ],
).enableRLS();

// A one-time link sent to an address on the company's domain. Only its SHA-256 hash is stored.
// Server-only: RLS on with no policies.
export const companyDomainVerifications = pgTable(
  "company_domain_verifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    email: text().notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("company_domain_verifications_company_id_idx").on(t.companyId)],
).enableRLS();

// ---------- Jobs ----------

// Jobs start as drafts. Publishing needs a verified company (trigger in drizzle/0015); candidates see
// open jobs of verified, approved companies.
export const jobStatus = pgEnum("job_status", ["draft", "open", "closed"]);

const isCompanyMember = (companyId: SQL) =>
  sql`exists (select 1 from company_members m where m.company_id = ${companyId} and m.profile_id = (select auth.uid()))`;

// Written only by the server (Drizzle). RLS lets company members read their company's jobs.
export const jobs = pgTable(
  "jobs",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    title: text().notNull().default(""),
    seniority: seniority(),
    employmentType: employmentType("employment_type"),
    workMode: workMode("work_mode"),
    // Where the work is. A remote job without a country is open to anyone.
    locationCity: text("location_city"),
    locationCountry: text("location_country"), // ISO 3166-1 alpha-2
    // Pay range, annual and gross. Required to publish.
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"), // ISO 4217
    description: text().notNull().default(""),
    // What the employer told the AI about the role.
    brief: text(),
    status: jobStatus().notNull().default("draft"),
    // Last time the AI looked for candidates for this job.
    matchedAt: timestamp("matched_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("jobs_company_id_idx").on(t.companyId),
    index("jobs_created_by_idx").on(t.createdBy),
    // Keep in sync with JOB_TITLE_MAX, JOB_DESCRIPTION_MAX and JOB_BRIEF_MAX.
    check("job_title_length", sql`char_length(${t.title}) <= 120`),
    check("job_description_length", sql`char_length(${t.description}) <= 8000`),
    check("job_brief_length", sql`char_length(${t.brief}) <= 4000`),
    check("job_salary_range", sql`${t.salaryMin} >= 0 and ${t.salaryMax} >= ${t.salaryMin}`),
    pgPolicy("Members can read their company's jobs", {
      for: "select",
      to: authenticatedRole,
      using: isCompanyMember(sql`${t.companyId}`),
    }),
  ],
).enableRLS();

export const jobSkills = pgTable(
  "job_skills",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    position: smallint().notNull(), // display order
  },
  (t) => [
    primaryKey({ columns: [t.jobId, t.skillId] }),
    index("job_skills_skill_id_idx").on(t.skillId),
    pgPolicy("Members can read their company's job skills", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from jobs j where j.id = ${t.jobId} and ${isCompanyMember(sql`j.company_id`)})`,
    }),
  ],
).enableRLS();

// ---------- Swipes ----------

// A candidate's like or pass on a job. A like from both sides is a match.
// Written only by the server (Drizzle). RLS lets candidates read their own swipes.
export const candidateSwipes = pgTable(
  "candidate_swipes",
  {
    profileId: profileId(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    liked: boolean().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.jobId] }),
    index("candidate_swipes_job_id_idx").on(t.jobId),
    pgPolicy("Candidates can read their own swipes", { for: "select", to: authenticatedRole, using: ownsRow }),
  ],
).enableRLS();

// An employer's like or pass on a candidate for one of their company's jobs.
export const employerSwipes = pgTable(
  "employer_swipes",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // The employer candidates contact after a match.
    decidedBy: uuid("decided_by").references(() => profiles.id, { onDelete: "set null" }),
    liked: boolean().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.jobId, t.candidateId] }),
    index("employer_swipes_candidate_id_idx").on(t.candidateId),
    index("employer_swipes_decided_by_idx").on(t.decidedBy),
    pgPolicy("Members can read their company's swipes", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from jobs j where j.id = ${t.jobId} and ${isCompanyMember(sql`j.company_id`)})`,
    }),
  ],
).enableRLS();

// ---------- AI matches ----------

// Claude's score for a job and a candidate. Only pairs at or above the threshold reach either deck.
// Every score is kept (with its reasons and model) so any decision can be audited, and so an
// unchanged pair isn't scored twice. Written and read only by the server (Drizzle); no client access.
export const jobMatches = pgTable(
  "job_matches",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    score: smallint().notNull(), // 0–100
    // The job's skills the AI found in the profile (equivalents count), and their share of the job's skills.
    matchedSkills: text("matched_skills").array().notNull().default(sql`'{}'`),
    skillCoverage: smallint("skill_coverage").notNull().default(0), // 0–100
    // Why it fits, told to each side.
    candidateReason: text("candidate_reason").notNull(),
    employerReason: text("employer_reason").notNull(),
    model: text().notNull(),
    // Hash of everything the model saw; the same input isn't scored again.
    inputHash: text("input_hash").notNull(),
    scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
    // When the pair was first scored; rescoring doesn't change it, so the digest counts only new pairs.
    firstScoredAt: timestamp("first_scored_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.jobId, t.candidateId] }),
    index("job_matches_candidate_id_idx").on(t.candidateId),
    check("job_match_score_range", sql`${t.score} between 0 and 100`),
    check("job_match_skill_coverage_range", sql`${t.skillCoverage} between 0 and 100`),
  ],
).enableRLS();

export type Job = typeof jobs.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Education = typeof educations.$inferSelect;
export type Certification = typeof certifications.$inferSelect;
export type CandidateLanguage = typeof candidateLanguages.$inferSelect;
