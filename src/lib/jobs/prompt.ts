import { EMPLOYMENT_TYPES, SENIORITY, WORK_MODES } from "@/lib/candidate/schemas";
import { cleanName, normalizeSlug } from "@/lib/candidate/slug";
import { JOB_DESCRIPTION_MAX, JOB_SKILL_MAX, JOB_SKILLS_MAX, JOB_TITLE_MAX, type JobDraft, type RoleType } from "./schemas";

// A new post keeps any role type the employer already chose; a refine sends the post on screen.
export type DraftRequest = { companyName: string } & (
  | { roleType: RoleType; brief: string }
  | { current: Omit<JobDraft, keyof RoleType> & RoleType; instruction: string }
);

function roleTypeLines({ seniority, employmentType, workMode }: RoleType) {
  return [
    seniority && `Seniority: ${SENIORITY[seniority]}`,
    employmentType && `Employment type: ${EMPLOYMENT_TYPES[employmentType]}`,
    workMode && `Work mode: ${WORK_MODES[workMode]}`,
  ].filter(Boolean);
}

export function buildDraftPrompt(request: DraftRequest): string {
  const company = `Company: ${request.companyName}`;
  if ("brief" in request) {
    const chosen = roleTypeLines(request.roleType);
    return [
      company,
      ...(chosen.length ? ["", "The employer chose:", ...chosen] : []),
      "",
      "The employer describes the role:",
      request.brief,
      "",
      "Write the job post.",
    ].join("\n");
  }
  const { current, instruction } = request;
  return [
    company,
    "",
    "The current job post:",
    `Title: ${current.title}`,
    ...roleTypeLines(current),
    `Skills: ${current.skills.join(", ")}`,
    "Description:",
    current.description,
    "",
    "The employer wants this changed:",
    instruction,
    "",
    "Rewrite the job post with that change.",
  ].join("\n");
}

// The model doesn't enforce lengths, so trim its output to what the form accepts.
export function clampDraft(draft: JobDraft): JobDraft {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const raw of draft.skills) {
    const name = cleanName(raw).slice(0, JOB_SKILL_MAX).trimEnd();
    const slug = normalizeSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    skills.push(name);
    if (skills.length === JOB_SKILLS_MAX) break;
  }
  return {
    ...draft,
    title: draft.title.trim().slice(0, JOB_TITLE_MAX).trimEnd(),
    description: draft.description.trim().slice(0, JOB_DESCRIPTION_MAX).trimEnd(),
    skills,
  };
}

// The AI fills in whatever the employer left blank on a new post; their own choices stay.
export function keepChosenRoleType(chosen: RoleType, draft: JobDraft): JobDraft {
  return {
    ...draft,
    seniority: chosen.seniority ?? draft.seniority,
    employmentType: chosen.employmentType ?? draft.employmentType,
    workMode: chosen.workMode ?? draft.workMode,
  };
}
