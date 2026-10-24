import { z } from "zod";

// Option lists mirror the Postgres enums in src/db/schema.ts.
export const SENIORITY = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  principal: "Principal",
  executive: "Executive",
} as const;
export const WORK_MODES = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" } as const;
export const EMPLOYMENT_TYPES = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
} as const;
export const AVAILABILITY = {
  immediately: "Immediately",
  "2_weeks": "In 2 weeks",
  "1_month": "In 1 month",
  "2_months": "In 2 months",
  "3_months_plus": "In 3+ months",
} as const;
export const JOB_SEARCH_STATUS = {
  actively_looking: "Actively looking",
  open_to_offers: "Open to offers",
  not_looking: "Not looking right now",
} as const;
export const SKILL_LEVELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
} as const;
export const LANGUAGE_PROFICIENCY = {
  basic: "Basic",
  conversational: "Conversational",
  professional: "Professional",
  native: "Native",
} as const;
export const CURRENCIES = ["EUR", "USD", "GBP", "BGN", "CHF", "PLN", "RON", "CZK", "SEK"] as const;
export const DEFAULT_CURRENCY: (typeof CURRENCIES)[number] = "EUR";

// Limits shared by the forms (maxLength, max items) and the schemas below.
export const HEADLINE_MAX = 120;
export const ABOUT_MAX = 2000; // also a check constraint on candidate_profiles.about
export const DESCRIPTION_MAX = 3000;
export const MAX_ROLES = 5;
export const MAX_SKILLS = 50;
export const MAX_SKILL_YEARS = 50;
export const MAX_EXPERIENCES = 30;
export const MAX_EDUCATIONS = 15;
export const MAX_CERTIFICATIONS = 30;
export const MAX_LANGUAGES = 15;
export const MAX_HIDDEN_DOMAINS = 20;
export const MAX_RESUME_MB = 5;
export const MAX_RESUME_BYTES = MAX_RESUME_MB * 1024 * 1024;

const keys = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const seniority = z.enum(keys(SENIORITY));
const workMode = z.enum(keys(WORK_MODES));
const employmentType = z.enum(keys(EMPLOYMENT_TYPES));
const skillLevel = z.enum(keys(SKILL_LEVELS));
const languageProficiency = z.enum(keys(LANGUAGE_PROFICIENCY));

// Empty form fields arrive as "", which we store as null.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable();
const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);
const optionalUrl = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.url({ protocol: /^https?$/, error: "Enter a full link starting with https://" }).nullable());
const optionalEnum = <T extends z.ZodEnum>(e: T) =>
  z.union([z.literal("").transform(() => null), e]).nullable();
const month = z.string().regex(/^\d{4}-\d{2}$/, "Pick a month");
const year = z.coerce.number().int().min(1950).max(2100);
const optionalYear = z.union([z.literal("").transform(() => null), year]).nullable();
const domain = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
  .pipe(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Enter a domain like acme.com"));

export const aboutSchema = z.object({
  headline: requiredText(HEADLINE_MAX, "Add a headline"),
  about: requiredText(ABOUT_MAX, "Write a few sentences about yourself"),
  locationCity: optionalText(100),
  locationCountry: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Pick a country"),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
});

export const preferencesSchema = z.object({
  roles: z
    .array(requiredText(80, "Role can't be empty"))
    .min(1, "Pick at least one role")
    .max(MAX_ROLES, `Pick up to ${MAX_ROLES} roles`),
  seniority: optionalEnum(seniority),
  workModes: z.array(workMode).min(1, "Pick at least one work mode"),
  employmentTypes: z.array(employmentType),
  salaryMin: z
    .union([z.literal("").transform(() => null), z.coerce.number().int().min(0).max(10_000_000)])
    .nullable(),
  salaryCurrency: z.enum(CURRENCIES).nullable(),
  availableFrom: optionalEnum(z.enum(keys(AVAILABILITY))),
  jobSearchStatus: optionalEnum(z.enum(keys(JOB_SEARCH_STATUS))),
  openToRelocation: z.boolean(),
  workAuthorization: optionalText(200),
});

export const experienceSchema = z
  .object({
    companyName: requiredText(120, "Add the company name"),
    companyDomain: z.union([z.literal("").transform(() => null), domain]).nullable(),
    title: requiredText(120, "Add your job title"),
    employmentType: optionalEnum(employmentType),
    location: optionalText(120),
    isRemote: z.boolean(),
    startMonth: month,
    endMonth: z.union([z.literal("").transform(() => null), month]).nullable(),
    description: optionalText(DESCRIPTION_MAX),
  })
  .refine((e) => !e.endMonth || e.endMonth >= e.startMonth, {
    message: "End date must be after the start date",
    path: ["endMonth"],
  });

export const experiencesSchema = z.object({
  experiences: z.array(experienceSchema).max(MAX_EXPERIENCES),
  noExperience: z.boolean(),
});

export const skillsSchema = z.object({
  skills: z
    .array(
      z.object({
        name: requiredText(60, "Skill can't be empty"),
        level: optionalEnum(skillLevel),
        years: z.union([z.literal("").transform(() => null), z.coerce.number().int().min(0).max(MAX_SKILL_YEARS)]).nullable(),
      }),
    )
    .max(MAX_SKILLS, `Add up to ${MAX_SKILLS} skills`),
});

export const educationsSchema = z.object({
  educations: z
    .array(
      z
        .object({
          institution: requiredText(160, "Add the school or university"),
          degree: optionalText(120),
          fieldOfStudy: optionalText(120),
          startYear: optionalYear,
          endYear: optionalYear,
        })
        .refine((e) => !e.startYear || !e.endYear || e.endYear >= e.startYear, {
          message: "End year must be after the start year",
          path: ["endYear"],
        }),
    )
    .max(MAX_EDUCATIONS),
});

export const certificationsSchema = z.object({
  certifications: z
    .array(
      z.object({
        name: requiredText(160, "Add the certification name"),
        issuer: optionalText(120),
        year: optionalYear,
      }),
    )
    .max(MAX_CERTIFICATIONS),
});

export const languagesSchema = z.object({
  languages: z
    .array(
      z.object({
        languageCode: z.string().regex(/^[a-z]{2}$/, "Pick a language"),
        proficiency: languageProficiency,
      }),
    )
    .max(MAX_LANGUAGES)
    .refine((list) => new Set(list.map((l) => l.languageCode)).size === list.length, "Each language only once"),
});

export const privacySchema = z.object({
  hiddenCompanyDomains: z.array(domain).max(MAX_HIDDEN_DOMAINS),
});

export type AboutInput = z.input<typeof aboutSchema>;
export type PreferencesInput = z.input<typeof preferencesSchema>;
export type ExperienceInput = z.input<typeof experienceSchema>;
export type SkillInput = z.input<typeof skillsSchema>["skills"][number];
export type EducationInput = z.input<typeof educationsSchema>["educations"][number];
export type CertificationInput = z.input<typeof certificationsSchema>["certifications"][number];
export type LanguageInput = z.input<typeof languagesSchema>["languages"][number];

// What Claude returns from a resume. Kept loose (nullable everywhere); the import validates
// each entry with the section schemas above and drops what doesn't fit.
export const resumeExtractionSchema = z.object({
  fullName: z.string().nullable(),
  headline: z.string().nullable().describe("Short professional headline, e.g. 'Senior backend engineer'"),
  about: z.string().nullable().describe("2-4 sentence first-person summary, under 1500 characters"),
  locationCity: z.string().nullable(),
  locationCountry: z.string().nullable().describe("ISO 3166-1 alpha-2 code, e.g. 'BG'"),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  seniority: seniority.nullable(),
  suggestedRoles: z.array(z.string()).describe("Up to 3 job titles this person is a fit for"),
  experiences: z.array(
    z.object({
      companyName: z.string(),
      companyDomain: z.string().nullable().describe("Company website domain if known, e.g. 'acme.com'"),
      title: z.string(),
      employmentType: employmentType.nullable(),
      location: z.string().nullable(),
      isRemote: z.boolean(),
      startMonth: z.string().describe("YYYY-MM; use -01 when only the year is known"),
      endMonth: z.string().nullable().describe("YYYY-MM, or null if this is the current job"),
      description: z.string().nullable(),
    }),
  ),
  skills: z.array(z.object({ name: z.string(), level: skillLevel.nullable() })),
  educations: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable(),
      fieldOfStudy: z.string().nullable(),
      startYear: z.number().int().nullable(),
      endYear: z.number().int().nullable(),
    }),
  ),
  certifications: z.array(
    z.object({ name: z.string(), issuer: z.string().nullable(), year: z.number().int().nullable() }),
  ),
  languages: z.array(
    z.object({
      languageCode: z.string().describe("ISO 639-1 code, e.g. 'en'"),
      proficiency: languageProficiency,
    }),
  ),
});

export type ResumeExtraction = z.infer<typeof resumeExtractionSchema>;

// Shape returned by every profile action, consumed by useActionState.
export type ActionState =
  | { status: "idle" }
  | { status: "saved"; at: number }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export function toActionError(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { status: "error", message: error.issues[0]?.message ?? "Check the highlighted fields", fieldErrors };
}
