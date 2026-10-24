import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireEmployer } from "@/lib/auth";
import { EMPLOYMENT_TYPES, SENIORITY, WORK_MODES } from "@/lib/candidate/schemas";
import { listJobs } from "@/lib/jobs/queries";

export const metadata: Metadata = {
  title: "Employer",
};

const STATUS_LABELS = { draft: "Draft", open: "Open", closed: "Closed" } as const;

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

  return (
    <>
      <AppHeader user={user} />
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
                        <RoleTypeLine {...job} />
                      </div>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

function RoleTypeLine({
  seniority,
  employmentType,
  workMode,
}: {
  seniority: keyof typeof SENIORITY | null;
  employmentType: keyof typeof EMPLOYMENT_TYPES | null;
  workMode: keyof typeof WORK_MODES | null;
}) {
  const parts = [
    seniority && SENIORITY[seniority],
    employmentType && EMPLOYMENT_TYPES[employmentType],
    workMode && WORK_MODES[workMode],
  ].filter(Boolean);
  return parts.length > 0 ? <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p> : null;
}
