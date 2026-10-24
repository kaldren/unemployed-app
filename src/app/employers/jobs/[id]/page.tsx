import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { requireEmployer } from "@/lib/auth";
import { getCatalogNames } from "@/lib/candidate/catalog";
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
      <AppHeader user={user} />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">{job.title || "Untitled job"}</h1>
          <JobEditor
            action={saveJob.bind(null, job.id)}
            aiEnabled={isAiConfigured()}
            skillSuggestions={catalog.skills}
            initial={{
              title: job.title,
              seniority: job.seniority ?? "",
              employmentType: job.employmentType ?? "",
              workMode: job.workMode ?? "",
              description: job.description,
              skills: job.skills,
            }}
          />
        </div>
      </main>
    </>
  );
}
