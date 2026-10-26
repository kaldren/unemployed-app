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
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

export const profileType = pgEnum("profile_type", ["candidate", "employer"]);

const isOwner = sql`(select auth.uid()) = id`;

// One row per auth user, created on first sign-in. Inserts happen server-side only.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid()
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: profileType().notNull(),
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

// `pending` until vetted; jobs go live only when `approved`.
export const companyStatus = pgEnum("company_status", ["pending", "approved", "needs_review", "rejected"]);
export const companyRole = pgEnum("company_role", ["owner", "member"]);

// The email domain is the company: the first employer from a domain creates it.
// Written only by the server (Drizzle). RLS lets members read their own company.
export const companies = pgTable(
  "companies",
  {
    id: uuid().primaryKey().defaultRandom(),
    domain: text().notNull().unique(), // lowercase, e.g. "acme.com"
    name: text().notNull(),
    status: companyStatus().notNull().default("pending"),
    // What the AI vetting said, kept so an admin can see why. Null until vetted.
    vettingReason: text("vetting_reason"),
    vettingModel: text("vetting_model"),
    vettedAt: timestamp("vetted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("domain_lowercase", sql`${t.domain} = lower(${t.domain})`),
    pgPolicy("Members can read their company", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from company_members m where m.company_id = ${t.id} and m.profile_id = (select auth.uid()))`,
    }),
  ],
).enableRLS();

// An employer belongs to exactly one company: the one for their email domain.
export const companyMembers = pgTable(
  "company_members",
  {
    profileId: profileId().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: companyRole().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("company_members_company_id_idx").on(t.companyId),
    pgPolicy("Employers can read their own membership", {
      for: "select",
      to: authenticatedRole,
      using: ownsRow,
    }),
  ],
).enableRLS();

// ---------- Jobs ----------

// Jobs start as drafts. Publishing (and going live once the company is approved) comes later.
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
