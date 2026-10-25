import { createHash } from "node:crypto";
import { z } from "zod";
import { COUNTRIES, LANGUAGES } from "@/lib/candidate/locales";
import {
  EMPLOYMENT_TYPES,
  LANGUAGE_PROFICIENCY,
  SENIORITY,
  SKILL_LEVELS,
  WORK_MODES,
} from "@/lib/candidate/schemas";
import type { RoleType } from "@/lib/jobs/schemas";

// Pairs scoring this or more reach both decks.
export const MATCH_THRESHOLD = 70;

const REASON_MAX = 400;

export const matchScoreSchema = z.object({
  score: z.int().describe("0-100: how well the candidate fits the role"),
  candidateReason: z.string().describe("To the candidate, in second person"),
  employerReason: z.string().describe("To the employer, about the candidate in third person"),
});

export type MatchScore = z.infer<typeof matchScoreSchema>;

export const MATCH_SYSTEM = `You screen candidates for jobs on a hiring platform. Only candidates you pass are shown
to the employer, and only jobs you pass are shown to the candidate, so both sides see few, qualified matches.
Score how well the candidate fits the job from 0 to 100:
- 85-100: meets every core requirement at the right level; a clear interview.
- 70-84: meets most core requirements; gaps are small or quick to learn.
- 40-69: related background, but missing a core skill or the wrong level.
- 0-39: a different kind of role.
Judge the core requirements (main skills, level, kind of work) more than the nice-to-haves, and evidence
(experience, years, level) more than listed skills. Seniority one step off is a small gap; more is a large one.
Ignore anything that says who the person is (age, gender, origin, names); judge only the work.
"candidateReason": one or two sentences to the candidate ("Your five years of ...").
"employerReason": one or two sentences to the employer about the candidate ("Five years of ...").
Both name the strongest fit and, below 85, the main gap. Plain words, no scores, no flattery.`;

export type MatchJob = RoleType & {
  title: string;
  companyName: string;
  description: string;
  skills: string[];
};

export type MatchCandidate = {
  headline: string | null;
  about: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  openToRelocation: boolean;
  seniority: keyof typeof SENIORITY | null;
  workModes: (keyof typeof WORK_MODES)[];
  employmentTypes: (keyof typeof EMPLOYMENT_TYPES)[];
  roles: string[];
  skills: { name: string; level: keyof typeof SKILL_LEVELS | null; years: number | null }[];
  experiences: {
    title: string;
    companyName: string;
    startDate: string;
    endDate: string | null;
    description: string | null;
  }[];
  educations: { institution: string; degree: string | null; fieldOfStudy: string | null; endYear: number | null }[];
  certifications: { name: string; issuer: string | null }[];
  languages: { languageCode: string; proficiency: keyof typeof LANGUAGE_PROFICIENCY }[];
};

const COUNTRY_NAMES = new Map(COUNTRIES);
const LANGUAGE_NAMES = new Map(LANGUAGES);

const join = (items: (string | null | undefined | false)[], separator = ", ") => items.filter(Boolean).join(separator);
const section = (title: string, lines: string[]) => (lines.length ? ["", `${title}:`, ...lines] : []);

function jobLines(job: MatchJob) {
  return [
    "THE JOB",
    `Title: ${job.title}`,
    `Company: ${job.companyName}`,
    job.seniority && `Seniority: ${SENIORITY[job.seniority]}`,
    job.employmentType && `Employment type: ${EMPLOYMENT_TYPES[job.employmentType]}`,
    job.workMode && `Work mode: ${WORK_MODES[job.workMode]}`,
    `Skills, most important first: ${job.skills.join(", ")}`,
    "Description:",
    job.description,
  ].filter((line): line is string => Boolean(line));
}

// The candidate without name, contact details or links: the model judges the work only.
function candidateLines(c: MatchCandidate) {
  const location = join([c.locationCity, c.locationCountry && COUNTRY_NAMES.get(c.locationCountry)]);
  return [
    "THE CANDIDATE",
    `Headline: ${c.headline ?? ""}`,
    c.seniority && `Seniority: ${SENIORITY[c.seniority]}`,
    location && `Location: ${location}${c.openToRelocation ? " (open to relocation)" : ""}`,
    c.workModes.length > 0 && `Work modes: ${c.workModes.map((m) => WORK_MODES[m]).join(", ")}`,
    c.employmentTypes.length > 0 && `Employment types: ${c.employmentTypes.map((t) => EMPLOYMENT_TYPES[t]).join(", ")}`,
    c.roles.length > 0 && `Looking for: ${c.roles.join(", ")}`,
    "About:",
    c.about ?? "",
    ...section(
      "Skills",
      c.skills.map((s) => `- ${join([s.name, s.level && SKILL_LEVELS[s.level], s.years != null && `${s.years} years`])}`),
    ),
    ...section(
      "Experience, most recent first",
      c.experiences.map((e) =>
        join(
          [
            `- ${e.title} at ${e.companyName}, ${e.startDate.slice(0, 7)} to ${e.endDate ? e.endDate.slice(0, 7) : "now"}`,
            e.description && `  ${e.description}`,
          ],
          "\n",
        ),
      ),
    ),
    ...section(
      "Education",
      c.educations.map((e) => `- ${join([e.degree, e.fieldOfStudy, e.institution, e.endYear != null && String(e.endYear)])}`),
    ),
    ...section(
      "Certifications",
      c.certifications.map((cert) => `- ${join([cert.name, cert.issuer])}`),
    ),
    ...section(
      "Languages",
      c.languages.map(
        (l) => `- ${LANGUAGE_NAMES.get(l.languageCode) ?? l.languageCode}: ${LANGUAGE_PROFICIENCY[l.proficiency]}`,
      ),
    ),
  ].filter((line): line is string => line !== false && line !== null && line !== "");
}

export function buildMatchPrompt(job: MatchJob, candidate: MatchCandidate): string {
  return [...jobLines(job), "", ...candidateLines(candidate), "", "Score this candidate for this job."].join("\n");
}

// Identifies what the model was asked: the same hash means the score still stands.
export function matchInputHash(model: string, prompt: string): string {
  return createHash("sha256").update(`${model}\n${MATCH_SYSTEM}\n${prompt}`).digest("hex");
}

// The model doesn't enforce ranges or lengths, so clamp its output to what we store.
export function clampScore(result: MatchScore): MatchScore {
  const reason = (text: string) => text.trim().slice(0, REASON_MAX).trimEnd();
  return {
    score: Math.max(0, Math.min(100, Math.round(result.score))),
    candidateReason: reason(result.candidateReason),
    employerReason: reason(result.employerReason),
  };
}
