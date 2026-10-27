import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { DeleteAccount } from "@/components/delete-account";
import { PageLoading } from "@/components/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireEmployer, type CurrentEmployer } from "@/lib/auth";
import { vetCompanySoon } from "@/lib/employer/vetting";
import { roleTypeLabel } from "@/lib/jobs/labels";
import { listJobs } from "@/lib/jobs/queries";
import { JOB_STATUS } from "@/lib/jobs/schemas";
import { COMPANY_PATH } from "@/lib/portal";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Employer",
};

const STATUS_LABELS = { ...JOB_STATUS, closed: "Closed" } as const;

export default function EmployerHome() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Jobs />
    </Suspense>
  );
}

async function Jobs() {
  const user = await requireEmployer();
  const jobs = await listJobs(user.company.id);
  // Catches verified companies whose vetting never ran (made before vetting existed, or the run was lost).
  if (user.company.status === "pending" && user.company.verifiedAt) vetCompanySoon(user.company.id, user.company.domain);

  return (
    <>
      <AppHeader user={user} view="employer" />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-4xl font-semibold tracking-tight text-balance">
                Welcome{user.fullName ? `, ${user.fullName}` : ""}
              </h1>
              <p className="text-base text-muted-foreground">
                Hiring for <span className="font-medium text-foreground">{user.company.name}</span>
              </p>
              <VerificationNote company={user.company} />
            </div>
            {jobs.length > 0 && (
              <Button asChild>
                <Link href="/employers/jobs/new">New job</Link>
              </Button>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Add your first job. Describe the role and AI writes a draft you can edit.
              </p>
              <Button asChild variant="outline">
                <Link href="/employers/jobs/new">Add a job</Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Jobs">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Card
                    asChild
                    size="sm"
                    className="px-4 outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Link href={`/employers/jobs/${job.id}`}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-base font-medium">{job.title || "Untitled job"}</span>
                          <Badge variant="secondary">{STATUS_LABELS[job.status]}</Badge>
                        </div>
                        <RoleType label={roleTypeLabel(job)} />
                      </div>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <section aria-label="Account" className="pt-10">
            <DeleteAccount description="Deleting your account keeps your company and its jobs for your teammates. If you're its only member, they're deleted too." />
          </section>
        </div>
      </main>
    </>
  );
}

// Candidates see a company's jobs once it has verified its domain and passed vetting, so say what's missing.
function VerificationNote({ company }: { company: CurrentEmployer["company"] }) {
  if (!company.verifiedAt) {
    return (
      <p className="text-sm text-warning">
        Verify {company.domain} to publish jobs.{" "}
        <Link href={COMPANY_PATH} className="font-medium underline underline-offset-4">
          Verify now
        </Link>
      </p>
    );
  }
  if (company.status === "approved") return null;
  if (company.status === "rejected") {
    return (
      <p className="text-sm text-destructive">
        We couldn&apos;t verify your company, so candidates won&apos;t see your jobs. If this is a mistake, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      We&apos;re reviewing your company. Candidates see your jobs once it&apos;s approved, usually within a day.
    </p>
  );
}

function RoleType({ label }: { label: string }) {
  return label ? <p className="text-sm text-muted-foreground">{label}</p> : null;
}
