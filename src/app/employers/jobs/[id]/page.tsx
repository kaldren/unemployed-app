import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { canHire, requireEmployer } from "@/lib/auth";
import { getCatalogNames } from "@/lib/candidate/catalog";
import { DEFAULT_CURRENCY } from "@/lib/candidate/schemas";
import { isAiConfigured } from "@/lib/jobs/draft";
import { getJob } from "@/lib/jobs/queries";
import { saveJob } from "../actions";
import { JobEditor } from "./job-editor";

export const metadata: Metadata = {
  title: "Edit job",
};

export default function JobPage({ params }: PageProps<"/employers/jobs/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Job params={params} />
    </Suspense>
  );
}

async function Job({ params }: Pick<PageProps<"/employers/jobs/[id]">, "params">) {
  const [user, { id }] = await Promise.all([requireEmployer(), params]);
  const [job, catalog] = await Promise.all([getJob(user.company.id, id), getCatalogNames()]);
  if (!job) notFound();

  return (
    <>
      <AppHeader user={user} view="employer" />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-4xl font-semibold tracking-tight text-balance">{job.title || "Untitled job"}</h1>
            {job.status === "open" && (
              <Button asChild variant="outline">
                <Link href={`/employers/jobs/${job.id}/candidates`}>Review candidates</Link>
              </Button>
            )}
          </div>
          <JobEditor
            action={saveJob.bind(null, job.id)}
            aiEnabled={isAiConfigured()}
            companyVerified={user.company.verifiedAt !== null}
            companyApproved={canHire(user.company)}
            skillSuggestions={catalog.skills}
            initial={{
              title: job.title,
              seniority: job.seniority ?? "",
              employmentType: job.employmentType ?? "",
              workMode: job.workMode ?? "",
              description: job.description,
              skills: job.skills,
              locationCountry: job.locationCountry ?? "",
              locationCity: job.locationCity ?? "",
              salaryMin: job.salaryMin?.toString() ?? "",
              salaryMax: job.salaryMax?.toString() ?? "",
              salaryCurrency: job.salaryCurrency ?? DEFAULT_CURRENCY,
              status: job.status === "open" ? "open" : "draft",
            }}
          />
        </div>
      </main>
    </>
  );
}
