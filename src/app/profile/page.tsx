import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { requireCandidate } from "@/lib/auth";
import { getCatalogNames } from "@/lib/candidate/catalog";
import { COMPLETENESS_STEPS, getMissingItems, type ProfileSection } from "@/lib/candidate/completeness";
import { getCandidateProfile } from "@/lib/candidate/queries";
import { cn } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@/lib/candidate/schemas";
import { SectionTabs, type Tab } from "./section-tabs";
import { DeleteAccount } from "@/components/delete-account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Suspense fallback={<PageLoading />}>
      <ProfileEditor />
    </Suspense>
  );
}

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const month = (date: string | null) => (date ? date.slice(0, 7) : "");

async function ProfileEditor() {
  const user = await requireCandidate();

  const [data, catalog] = await Promise.all([getCandidateProfile(user.id), getCatalogNames()]);
  const p = data.profile;
  const missing = getMissingItems(data);
  const done = COMPLETENESS_STEPS - missing.length;
  const status = (section: ProfileSection) => (missing.some((m) => m.section === section) ? "todo" : "done");
  const currentDomains = data.experiences.flatMap((e) => (!e.endDate && e.companyDomain ? [e.companyDomain] : []));

  const sections: Tab[] = [
    {
      id: "about",
      label: "About you",
      status: status("about"),
      content: (
        <AboutSection
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
      status: status("preferences"),
      content: (
        <PreferencesSection
          roleSuggestions={catalog.roles}
          initial={{
            roles: data.roles,
            seniority: str(p?.seniority),
            workModes: p?.workModes ?? [],
            employmentTypes: p?.employmentTypes ?? [],
            salaryMin: str(p?.salaryMin),
            salaryCurrency: p?.salaryCurrency ?? DEFAULT_CURRENCY,
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
      status: status("experience"),
      content: (
        <ExperienceSection
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
      status: status("skills"),
      content: (
        <SkillsSection
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
          initial={data.languages.map((l) => ({ languageCode: l.languageCode, proficiency: l.proficiency }))}
        />
      ),
    },
    {
      id: "privacy",
      label: "Hide my profile from",
      status: "optional",
      content: <PrivacySection initial={p?.hiddenCompanyDomains ?? []} suggestions={currentDomains} />,
    },
    {
      id: "account",
      label: "Account",
      status: "optional",
      content: (
        <Card asChild>
          <section aria-labelledby="account-title">
            <CardHeader>
              <CardTitle asChild>
                <h2 id="account-title">Account</h2>
              </CardTitle>
              <CardDescription>Signed in as {user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteAccount description="Deleting your account removes your profile, likes and matches for good." />
            </CardContent>
          </section>
        </Card>
      ),
    },
  ];

  const initial = sections.find((t) => t.status === "todo")?.id ?? "about";

  return (
    <>
      <AppHeader user={user} current="profile" />
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
                  className={cn("h-full rounded-full transition-[width]", missing.length === 0 ? "bg-success" : "bg-brand")}
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
              { tabs: sections },
              { label: "Optional", tabs: extras },
            ]}
          />
        </div>
      </main>
    </>
  );
}
