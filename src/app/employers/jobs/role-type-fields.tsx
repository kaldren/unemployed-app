"use client";

import { Select } from "@/components/form";
import { EMPLOYMENT_TYPES, SENIORITY, WORK_MODES } from "@/lib/candidate/schemas";

export type RoleTypeState = { seniority: string; employmentType: string; workMode: string };

// The kind of role: chosen by the employer, never by the AI.
export function RoleTypeFields({ value, onChange }: { value: RoleTypeState; onChange: (patch: Partial<RoleTypeState>) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Select
        label="Seniority"
        name="seniority"
        options={SENIORITY}
        value={value.seniority}
        onChange={(seniority) => onChange({ seniority })}
      />
      <Select
        label="Employment type"
        name="employmentType"
        options={EMPLOYMENT_TYPES}
        value={value.employmentType}
        onChange={(employmentType) => onChange({ employmentType })}
      />
      <Select
        label="Work mode"
        name="workMode"
        options={WORK_MODES}
        value={value.workMode}
        onChange={(workMode) => onChange({ workMode })}
      />
    </div>
  );
}
