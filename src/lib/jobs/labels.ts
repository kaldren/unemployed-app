import { COUNTRIES } from "@/lib/candidate/locales";
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

const COUNTRY_NAMES = new Map(COUNTRIES);

type PlaceParts = { workMode: keyof typeof WORK_MODES | null; locationCity: string | null; locationCountry: string | null };

// "Sofia, Bulgaria", or for remote jobs "Remote from Bulgaria" / "Remote from anywhere".
export function locationLabel({ workMode, locationCity, locationCountry }: PlaceParts): string {
  const country = locationCountry && (COUNTRY_NAMES.get(locationCountry) ?? locationCountry);
  if (workMode === "remote") return `Remote from ${country || "anywhere"}`;
  return [locationCity, country].filter(Boolean).join(", ");
}

type SalaryParts = { salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null };

// "EUR 50,000–70,000 a year". Empty unless both ends are set.
export function salaryLabel({ salaryMin, salaryMax, salaryCurrency }: SalaryParts): string {
  if (salaryMin === null || salaryMax === null) return "";
  const amount = (n: number) => n.toLocaleString("en-US");
  const range = salaryMin === salaryMax ? amount(salaryMin) : `${amount(salaryMin)}–${amount(salaryMax)}`;
  return `${salaryCurrency ?? ""} ${range} a year`.trim();
}
