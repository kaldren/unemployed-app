"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { COUNTRIES, LANGUAGES } from "@/lib/candidate/locales";
import { MIN_SKILLS } from "@/lib/candidate/completeness";
import {
  ABOUT_MAX,
  AVAILABILITY,
  CURRENCIES,
  DESCRIPTION_MAX,
  EMPLOYMENT_TYPES,
  HEADLINE_MAX,
  JOB_SEARCH_STATUS,
  LANGUAGE_PROFICIENCY,
  MAX_CERTIFICATIONS,
  MAX_EDUCATIONS,
  MAX_EXPERIENCES,
  MAX_HIDDEN_DOMAINS,
  MAX_LANGUAGES,
  MAX_ROLES,
  MAX_SKILL_YEARS,
  MAX_SKILLS,
  SENIORITY,
  SKILL_LEVELS,
  WORK_MODES,
  type AboutInput,
  type CertificationInput,
  type EducationInput,
  type ExperienceInput,
  type LanguageInput,
  type SkillInput,
} from "@/lib/candidate/schemas";
import {
  saveAbout,
  saveCertifications,
  saveEducations,
  saveExperiences,
  saveLanguages,
  savePreferences,
  savePrivacy,
  saveSkills,
} from "./actions";
import {
  Checkbox,
  CheckboxGroup,
  FieldError,
  ListEditor,
  SectionForm,
  Select,
  SelectOptions,
  TagInput,
  TextArea,
  TextInput,
  updateAt,
} from "@/components/form";

// Form state is all strings/booleans; the server schemas turn "" into null.
type WorkMode = keyof typeof WORK_MODES;
type EmploymentType = keyof typeof EMPLOYMENT_TYPES;

export type PreferencesState = {
  roles: string[];
  seniority: string;
  workModes: WorkMode[];
  employmentTypes: EmploymentType[];
  salaryMin: string;
  salaryCurrency: string;
  availableFrom: string;
  jobSearchStatus: string;
  openToRelocation: boolean;
  workAuthorization: string;
};

type Stringly<T> = { [K in keyof T]-?: T[K] extends boolean ? boolean : string };
export type ExperienceState = Stringly<ExperienceInput> & { isCurrent: boolean };
export type SkillState = Stringly<SkillInput>;
export type EducationState = Stringly<EducationInput>;
export type CertificationState = Stringly<CertificationInput>;
export type LanguageState = Stringly<LanguageInput>;

const grid = "grid gap-4 sm:grid-cols-2";

export function AboutSection({ initial }: { initial: Stringly<AboutInput> }) {
  const [v, setV] = useState(initial);
  const set = (patch: Partial<typeof v>) => setV({ ...v, ...patch });
  return (
    <SectionForm id="about" title="About you" description="The first thing employers read on your card." action={saveAbout} data={v}>
      <TextInput
        label="Headline"
        name="headline"
        value={v.headline}
        onChange={(headline) => set({ headline })}
        maxLength={HEADLINE_MAX}
        placeholder="Senior backend engineer focused on payments"
      />
      <TextArea
        label="About"
        name="about"
        value={v.about}
        onChange={(about) => set({ about })}
        maxLength={ABOUT_MAX}
        rows={5}
        placeholder="What you do, what you're great at, and what you want to work on next."
        hint={`${v.about.length}/${ABOUT_MAX}`}
      />
      <div className={grid}>
        <Select
          label="Country"
          name="locationCountry"
          value={v.locationCountry}
          onChange={(locationCountry) => set({ locationCountry })}
          options={COUNTRIES}
        />
        <TextInput label="City" name="locationCity" value={v.locationCity} onChange={(locationCity) => set({ locationCity })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextInput
          label="LinkedIn"
          name="linkedinUrl"
          type="url"
          value={v.linkedinUrl}
          onChange={(linkedinUrl) => set({ linkedinUrl })}
          placeholder="https://linkedin.com/in/…"
        />
        <TextInput
          label="GitHub"
          name="githubUrl"
          type="url"
          value={v.githubUrl}
          onChange={(githubUrl) => set({ githubUrl })}
          placeholder="https://github.com/…"
        />
        <TextInput
          label="Portfolio or website"
          name="portfolioUrl"
          type="url"
          value={v.portfolioUrl}
          onChange={(portfolioUrl) => set({ portfolioUrl })}
          placeholder="https://…"
        />
      </div>
    </SectionForm>
  );
}

export function PreferencesSection({ initial, roleSuggestions }: { initial: PreferencesState; roleSuggestions: string[] }) {
  const [v, setV] = useState(initial);
  const set = (patch: Partial<PreferencesState>) => setV({ ...v, ...patch });
  return (
    <SectionForm
      id="preferences"
      title="What you're looking for"
      description="We only match you with jobs that fit these."
      action={savePreferences}
      data={v}
    >
      <TagInput
        label="Roles"
        name="roles"
        value={v.roles}
        onChange={(roles) => set({ roles })}
        suggestions={roleSuggestions}
        max={MAX_ROLES}
        placeholder="e.g. Backend Engineer"
        hint={`Up to ${MAX_ROLES}. Pick from the list or type your own.`}
      />
      <div className={grid}>
        <Select label="Seniority" name="seniority" value={v.seniority} onChange={(seniority) => set({ seniority })} options={SENIORITY} />
        <Select
          label="Job search status"
          name="jobSearchStatus"
          value={v.jobSearchStatus}
          onChange={(jobSearchStatus) => set({ jobSearchStatus })}
          options={JOB_SEARCH_STATUS}
        />
      </div>
      <CheckboxGroup label="Work mode" name="workModes" options={WORK_MODES} value={v.workModes} onChange={(workModes) => set({ workModes })} />
      <CheckboxGroup
        label="Employment type"
        name="employmentTypes"
        options={EMPLOYMENT_TYPES}
        value={v.employmentTypes}
        onChange={(employmentTypes) => set({ employmentTypes })}
      />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_2fr]">
        <TextInput
          label="Minimum salary (yearly, gross)"
          name="salaryMin"
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          value={v.salaryMin}
          onChange={(salaryMin) => set({ salaryMin })}
          hint="Never shown to employers. Used only to filter jobs."
        />
        <Select
          label="Currency"
          name="salaryCurrency"
          value={v.salaryCurrency}
          onChange={(salaryCurrency) => set({ salaryCurrency })}
          options={CURRENCIES.map((c): [string, string] => [c, c])}
          placeholder={null}
        />
        <Select
          label="Available to start"
          name="availableFrom"
          value={v.availableFrom}
          onChange={(availableFrom) => set({ availableFrom })}
          options={AVAILABILITY}
        />
      </div>
      <TextInput
        label="Work authorization"
        name="workAuthorization"
        value={v.workAuthorization}
        onChange={(workAuthorization) => set({ workAuthorization })}
        placeholder="e.g. EU citizen, needs visa sponsorship for the US"
      />
      <Checkbox label="Open to relocation" checked={v.openToRelocation} onChange={(openToRelocation) => set({ openToRelocation })} />
    </SectionForm>
  );
}

const emptyExperience = (): ExperienceState => ({
  companyName: "",
  companyDomain: "",
  title: "",
  employmentType: "",
  location: "",
  isRemote: false,
  startMonth: "",
  endMonth: "",
  description: "",
  isCurrent: false,
});

export function ExperienceSection({ initial, noExperience }: { initial: ExperienceState[]; noExperience: boolean }) {
  const [items, setItems] = useState(initial);
  const [none, setNone] = useState(noExperience);
  // A current job has no end date. The server ignores isCurrent.
  const data = items.map((e) => (e.isCurrent ? { ...e, endMonth: "" } : e));

  return (
    <SectionForm
      id="experience"
      title="Work experience"
      description="Your previous and current employers."
      action={saveExperiences}
      data={{ experiences: data, noExperience: none }}
    >
      <ListEditor
        items={items}
        onChange={setItems}
        empty="No jobs added yet."
        addLabel="Add a job"
        newItem={emptyExperience}
        max={MAX_EXPERIENCES}
        renderItem={(e, update, i) => (
          <>
            <div className={grid}>
              <TextInput label="Job title" name={`experiences.${i}.title`} value={e.title} onChange={(title) => update({ title })} />
              <TextInput
                label="Company"
                name={`experiences.${i}.companyName`}
                value={e.companyName}
                onChange={(companyName) => update({ companyName })}
              />
              <TextInput
                label="Company website"
                name={`experiences.${i}.companyDomain`}
                value={e.companyDomain}
                onChange={(companyDomain) => update({ companyDomain })}
                placeholder="acme.com"
                hint="Optional. Helps us hide you from this company."
              />
              <Select
                label="Employment type"
                name={`experiences.${i}.employmentType`}
                value={e.employmentType}
                onChange={(employmentType) => update({ employmentType })}
                options={EMPLOYMENT_TYPES}
              />
              <TextInput
                label="Start"
                name={`experiences.${i}.startMonth`}
                type="month"
                value={e.startMonth}
                onChange={(startMonth) => update({ startMonth })}
                placeholder="YYYY-MM"
              />
              {!e.isCurrent && (
                <TextInput
                  label="End"
                  name={`experiences.${i}.endMonth`}
                  type="month"
                  value={e.endMonth}
                  onChange={(endMonth) => update({ endMonth })}
                  placeholder="YYYY-MM"
                />
              )}
              <TextInput label="Location" name={`experiences.${i}.location`} value={e.location} onChange={(location) => update({ location })} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Checkbox
                label="I currently work here"
                checked={e.isCurrent}
                onChange={(isCurrent) => update({ isCurrent })}
              />
              <Checkbox label="Remote" checked={e.isRemote} onChange={(isRemote) => update({ isRemote })} />
            </div>
            <TextArea
              label="What you did"
              name={`experiences.${i}.description`}
              value={e.description}
              onChange={(description) => update({ description })}
              maxLength={DESCRIPTION_MAX}
              rows={3}
              placeholder="Responsibilities, achievements, tech you used."
            />
          </>
        )}
      />
      {items.length === 0 && (
        <Checkbox label="I don't have work experience yet" checked={none} onChange={setNone} />
      )}
    </SectionForm>
  );
}

export function SkillsSection({ initial, suggestions }: { initial: SkillState[]; suggestions: string[] }) {
  const [items, setItems] = useState(initial);
  const names = items.map((s) => s.name);
  return (
    <SectionForm
      id="skills"
      title="Skills"
      description={`Add at least ${MIN_SKILLS}. Matching weighs your strongest skills most.`}
      action={saveSkills}
      data={{ skills: items }}
    >
      <TagInput
        label="Add skills"
        name="skills"
        value={names}
        onChange={(next) =>
          setItems(next.map((name) => items.find((s) => s.name === name) ?? { name, level: "", years: "" }))
        }
        suggestions={suggestions}
        max={MAX_SKILLS}
        placeholder="e.g. React, SQL, Figma"
      />
      {items.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-2 font-medium">Skill</th>
              <th className="pb-2 font-medium">Level</th>
              <th className="w-24 pb-2 font-medium">Years</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, i) => {
              const update = (patch: Partial<SkillState>) => setItems(updateAt(items, i, patch));
              return (
                <tr key={s.name} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium">{s.name}</td>
                  <td className="py-2 pr-3">
                    <NativeSelect
                      aria-label={`${s.name} level`}
                      value={s.level}
                      onChange={(e) => update({ level: e.target.value })}
                    >
                      <SelectOptions options={SKILL_LEVELS} placeholder="—" />
                    </NativeSelect>
                  </td>
                  <td className="py-2">
                    <Input
                      aria-label={`${s.name} years`}
                      type="number"
                      min={0}
                      max={MAX_SKILL_YEARS}
                      inputMode="numeric"
                      value={s.years}
                      onChange={(e) => update({ years: e.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </SectionForm>
  );
}

export function EducationSection({ initial }: { initial: EducationState[] }) {
  const [items, setItems] = useState(initial);
  return (
    <SectionForm id="education" title="Education" action={saveEducations} data={{ educations: items }}>
      <ListEditor
        items={items}
        onChange={setItems}
        empty="No education added."
        addLabel="Add education"
        newItem={() => ({ institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "" })}
        max={MAX_EDUCATIONS}
        renderItem={(e, update, i) => (
          <div className={grid}>
            <TextInput
              label="School or university"
              name={`educations.${i}.institution`}
              value={e.institution}
              onChange={(institution) => update({ institution })}
            />
            <TextInput label="Degree" name={`educations.${i}.degree`} value={e.degree} onChange={(degree) => update({ degree })} placeholder="BSc" />
            <TextInput
              label="Field of study"
              name={`educations.${i}.fieldOfStudy`}
              value={e.fieldOfStudy}
              onChange={(fieldOfStudy) => update({ fieldOfStudy })}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="From" name={`educations.${i}.startYear`} type="number" value={e.startYear} onChange={(startYear) => update({ startYear })} />
              <TextInput label="To" name={`educations.${i}.endYear`} type="number" value={e.endYear} onChange={(endYear) => update({ endYear })} />
            </div>
          </div>
        )}
      />
    </SectionForm>
  );
}

export function CertificationsSection({ initial }: { initial: CertificationState[] }) {
  const [items, setItems] = useState(initial);
  return (
    <SectionForm id="certifications" title="Certifications" action={saveCertifications} data={{ certifications: items }}>
      <ListEditor
        items={items}
        onChange={setItems}
        empty="No certifications added."
        addLabel="Add a certification"
        newItem={() => ({ name: "", issuer: "", year: "" })}
        max={MAX_CERTIFICATIONS}
        renderItem={(c, update, i) => (
          <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
            <TextInput label="Name" name={`certifications.${i}.name`} value={c.name} onChange={(name) => update({ name })} />
            <TextInput label="Issuer" name={`certifications.${i}.issuer`} value={c.issuer} onChange={(issuer) => update({ issuer })} />
            <TextInput label="Year" name={`certifications.${i}.year`} type="number" value={c.year} onChange={(year) => update({ year })} />
          </div>
        )}
      />
    </SectionForm>
  );
}

export function LanguagesSection({ initial }: { initial: LanguageState[] }) {
  const [items, setItems] = useState(initial);
  return (
    <SectionForm id="languages" title="Languages" action={saveLanguages} data={{ languages: items }}>
      <ListEditor
        items={items}
        onChange={setItems}
        empty="No languages added."
        addLabel="Add a language"
        newItem={() => ({ languageCode: "", proficiency: "professional" })}
        max={MAX_LANGUAGES}
        renderItem={(l, update, i) => (
          <div className={grid}>
            <Select
              label="Language"
              name={`languages.${i}.languageCode`}
              value={l.languageCode}
              onChange={(languageCode) => update({ languageCode })}
              options={LANGUAGES}
            />
            <Select
              label="Proficiency"
              name={`languages.${i}.proficiency`}
              value={l.proficiency}
              onChange={(proficiency) => update({ proficiency })}
              options={LANGUAGE_PROFICIENCY}
              placeholder={null}
            />
          </div>
        )}
      />
      <FieldError name="languages" />
    </SectionForm>
  );
}

export function PrivacySection({ initial, suggestions }: { initial: string[]; suggestions: string[] }) {
  const [domains, setDomains] = useState(initial);
  return (
    <SectionForm
      id="privacy"
      title="Hide my profile from"
      description="Companies with these website domains never see you in their matches. Add your current employer."
      action={savePrivacy}
      data={{ hiddenCompanyDomains: domains }}
    >
      <TagInput
        label="Company domains"
        name="hiddenCompanyDomains"
        value={domains}
        onChange={setDomains}
        suggestions={suggestions}
        max={MAX_HIDDEN_DOMAINS}
        placeholder="acme.com"
      />
    </SectionForm>
  );
}
