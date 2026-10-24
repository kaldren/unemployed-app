import { z } from "zod";
import { blankAsNull, EMPLOYMENT_TYPES, keys, SENIORITY, WORK_MODES } from "@/lib/candidate/schemas";

// Limits shared by the forms, the schemas and the AI draft. Titles, descriptions and briefs
// are also check constraints on `jobs`.
export const JOB_TITLE_MAX = 120;
export const JOB_DESCRIPTION_MAX = 8000;
export const JOB_BRIEF_MAX = 4000;
export const JOB_INSTRUCTION_MAX = 1000;
export const JOB_SKILLS_MAX = 20;
export const JOB_SKILL_MAX = 60;

// Selects post "" for "not set", which we store as null.
const optionalEnum = <T extends Record<string, string>>(options: T) => blankAsNull(z.enum(keys(options)));

export const roleTypeSchema = z.object({
  seniority: optionalEnum(SENIORITY),
  employmentType: optionalEnum(EMPLOYMENT_TYPES),
  workMode: optionalEnum(WORK_MODES),
});

const skillsList = z
  .array(z.string().trim().min(1, "Skill can't be empty").max(JOB_SKILL_MAX))
  .max(JOB_SKILLS_MAX, `Add up to ${JOB_SKILLS_MAX} skills`);

export const newJobSchema = roleTypeSchema.extend({
  brief: z.string().trim().max(JOB_BRIEF_MAX, `Keep it under ${JOB_BRIEF_MAX} characters`),
});

// Every saved post has a role type; the new-job form may leave blanks for the AI to fill.
const requiredEnum = <T extends Record<string, string>>(options: T, message: string) =>
  z.enum(keys(options), { error: message });

export const jobSchema = z.object({
  seniority: requiredEnum(SENIORITY, "Pick a seniority"),
  employmentType: requiredEnum(EMPLOYMENT_TYPES, "Pick an employment type"),
  workMode: requiredEnum(WORK_MODES, "Pick a work mode"),
  title: z.string().trim().min(1, "Add a job title").max(JOB_TITLE_MAX),
  description: z.string().trim().max(JOB_DESCRIPTION_MAX, `Keep it under ${JOB_DESCRIPTION_MAX} characters`),
  skills: skillsList,
});

export const refineSchema = z.object({
  instruction: z.string().trim().min(1, "Say what to change").max(JOB_INSTRUCTION_MAX),
  job: roleTypeSchema.extend({
    title: z.string().max(JOB_TITLE_MAX),
    description: z.string().max(JOB_DESCRIPTION_MAX),
    skills: z.array(z.string().max(JOB_SKILL_MAX)).max(JOB_SKILLS_MAX),
  }),
});

export type RoleType = z.output<typeof roleTypeSchema>;

// What the AI writes, role type included: it always picks one, and the employer can change it.
export const jobDraftSchema = z.object({
  title: z.string(),
  seniority: z.enum(keys(SENIORITY)),
  employmentType: z.enum(keys(EMPLOYMENT_TYPES)),
  workMode: z.enum(keys(WORK_MODES)),
  description: z.string(),
  skills: z.array(z.string()),
});

export type JobDraft = z.infer<typeof jobDraftSchema>;
