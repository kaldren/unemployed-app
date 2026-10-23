import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { getCatalogNames } from "@/lib/candidate/catalog";
import { COMPLETENESS_STEPS, MIN_SKILLS, getMissingItems } from "@/lib/candidate/completeness";
import { getCandidateProfile } from "@/lib/candidate/queries";
import { ResumeImport } from "./resume-import";
import { SectionTabs, type Tab } from "./section-tabs";
import {
  AboutSection,
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  LanguagesSection,
  PreferencesSection,
  PrivacySection,
  SkillsSection,
} from "./sections";

export const metadata: Metadata = {
  title: "Your profile",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="m-auto text-muted-foreground">Loading…</p>}>
      <ProfileEditor />
    </Suspense>
  );
}

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const month = (date: string | null) => (date ? date.slice(0, 7) : "");

async function ProfileEditor() {
  const user = await getCurrentUser();
  if (user.type !== "candidate") redirect("/");

  const [data, catalog] = await Promise.all([getCandidateProfile(user.id), getCatalogNames()]);
  const p = data.profile;
  const missing = getMissingItems(data);
  const done = COMPLETENESS_STEPS - missing.length;
  const hasListData =
    data.experiences.length + data.skills.length + data.educations.length + data.certifications.length > 0;
  const uploadedAt = p?.resumeUploadedAt?.toLocaleDateString("en-GB", { dateStyle: "medium" }) ?? null;
  const currentDomains = data.experiences.filter((e) => !e.endDate && e.companyDomain).map((e) => e.companyDomain!);

  // A new resume import rewrites every section, so remount them to pick up the new data.
  const version = p?.resumeUploadedAt?.getTime() ?? 0;

  const sections: Tab[] = [
    {
      id: "about",
      label: "About you",
      status: p?.headline && p.about && p.locationCountry ? "done" : "todo",
      content: (
        <AboutSection
          key={version}
          initial={{
            headline: str(p?.headline),
            about: str(p?.about),
            locationCity: str(p?.locationCity),
            locationCountry: str(p?.locationCountry),
            linkedinUrl: str(p?.linkedinUrl),
            githubUrl: str(p?.githubUrl),
            portfolioUrl: str(p?.portfolioUrl),
          }}
        />
      ),
    },
    {
      id: "preferences",
      label: "What you're looking for",
      status: data.roles.length > 0 && p?.workModes.length ? "done" : "todo",
      content: (
        <PreferencesSection
          key={version}
          roleSuggestions={catalog.roles}
          initial={{
            roles: data.roles,
            seniority: str(p?.seniority),
            workModes: p?.workModes ?? [],
            employmentTypes: p?.employmentTypes ?? [],
            salaryMin: str(p?.salaryMin),
            salaryCurrency: p?.salaryCurrency ?? "EUR",
            availableFrom: str(p?.availableFrom),
            jobSearchStatus: str(p?.jobSearchStatus),
            openToRelocation: p?.openToRelocation ?? false,
            workAuthorization: str(p?.workAuthorization),
          }}
        />
      ),
    },
    {
      id: "experience",
      label: "Work experience",
      status: data.experiences.length > 0 || p?.noExperience ? "done" : "todo",
      content: (
        <ExperienceSection
          key={version}
          noExperience={p?.noExperience ?? false}
          initial={data.experiences.map((e) => ({
            companyName: e.companyName,
            companyDomain: str(e.companyDomain),
            title: e.title,
            employmentType: str(e.employmentType),
            location: str(e.location),
            isRemote: e.isRemote,
            startMonth: month(e.startDate),
            endMonth: month(e.endDate),
            description: str(e.description),
            isCurrent: !e.endDate,
          }))}
        />
      ),
    },
    {
      id: "skills",
      label: "Skills",
      status: data.skills.length >= MIN_SKILLS ? "done" : "todo",
      content: (
        <SkillsSection
          key={version}
          suggestions={catalog.skills}
          initial={data.skills.map((s) => ({ name: s.name, level: str(s.level), years: str(s.years) }))}
        />
      ),
    },
  ];

  const extras: Tab[] = [
    {
      id: "education",
      label: "Education",
      status: "optional",
      content: (
        <EducationSection
          key={version}
          initial={data.educations.map((e) => ({
            institution: e.institution,
            degree: str(e.degree),
            fieldOfStudy: str(e.fieldOfStudy),
            startYear: str(e.startYear),
            endYear: str(e.endYear),
          }))}
        />
      ),
    },
    {
      id: "certifications",
      label: "Certifications",
      status: "optional",
      content: (
        <CertificationsSection
          key={version}
          initial={data.certifications.map((c) => ({ name: c.name, issuer: str(c.issuer), year: str(c.year) }))}
        />
      ),
    },
    {
      id: "languages",
      label: "Languages",
      status: "optional",
      content: (
        <LanguagesSection
          key={version}
          initial={data.languages.map((l) => ({ languageCode: l.languageCode, proficiency: l.proficiency }))}
        />
      ),
    },
    {
      id: "privacy",
      label: "Hide my profile from",
      status: "optional",
      content: <PrivacySection key={version} initial={p?.hiddenCompanyDomains ?? []} suggestions={currentDomains} />,
    },
  ];

  const resume: Tab = {
    id: "resume",
    label: "Import from resume",
    status: p?.resumeUploadedAt ? "done" : "optional",
    content: <ResumeImport hasProfileData={hasListData} uploadedAt={uploadedAt} />,
  };

  // Brand-new profiles start at the resume import; otherwise at the first thing still missing.
  const initial = !p && !hasListData ? "resume" : (sections.find((t) => t.status === "todo")?.id ?? "about");

  return (
    <>
      <AppHeader user={user} />
      <main className="flex flex-1 justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-5xl flex-col gap-10">
          <header className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold tracking-tight">Your profile</h1>
            <div className="flex max-w-md items-center gap-4">
              <div
                role="progressbar"
                aria-label="Profile completeness"
                aria-valuemin={0}
                aria-valuemax={COMPLETENESS_STEPS}
                aria-valuenow={done}
                className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full rounded-full transition-[width] ${missing.length === 0 ? "bg-success" : "bg-brand"}`}
                  style={{ width: `${(done / COMPLETENESS_STEPS) * 100}%` }}
                />
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">
                {missing.length === 0 ? "Your profile is complete" : "Complete your profile to get matches"}
              </p>
            </div>
          </header>

          <SectionTabs
            initial={initial}
            groups={[
              { tabs: [resume] },
              { tabs: sections },
              { label: "Optional", tabs: extras },
            ]}
          />
        </div>
      </main>
    </>
  );
}
