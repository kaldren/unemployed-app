import { sql } from "drizzle-orm";
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
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("about_length", sql`char_length(${t.about}) <= 2000`),
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

export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Education = typeof educations.$inferSelect;
export type Certification = typeof certifications.$inferSelect;
export type CandidateLanguage = typeof candidateLanguages.$inferSelect;
