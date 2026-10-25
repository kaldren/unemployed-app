import { EMPLOYMENT_TYPES, SENIORITY, WORK_MODES } from "@/lib/candidate/schemas";

type RoleTypeParts = {
  seniority: keyof typeof SENIORITY | null;
  employmentType: keyof typeof EMPLOYMENT_TYPES | null;
  workMode: keyof typeof WORK_MODES | null;
};

// "Senior · Full-time · Remote", skipping what isn't set. Empty when nothing is.
export function roleTypeLabel({ seniority, employmentType, workMode }: RoleTypeParts): string {
  return [
    seniority && SENIORITY[seniority],
    employmentType && EMPLOYMENT_TYPES[employmentType],
    workMode && WORK_MODES[workMode],
  ]
    .filter(Boolean)
    .join(" · ");
}
