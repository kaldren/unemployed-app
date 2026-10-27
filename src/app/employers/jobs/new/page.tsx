import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { requireEmployer } from "@/lib/auth";
import { isAiConfigured } from "@/lib/jobs/draft";
import { NewJobForm } from "./new-job-form";

export const metadata: Metadata = {
  title: "New job",
};

export default function NewJobPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewJob />
    </Suspense>
  );
}

async function NewJob() {
  const user = await requireEmployer();

  return (
    <>
      <AppHeader user={user} view="employer" />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold tracking-tight">New job</h1>
            <p className="text-base text-muted-foreground">
              Tell us about the role. AI writes a first draft you can edit.
            </p>
          </div>
          <NewJobForm aiEnabled={isAiConfigured()} />
        </div>
      </main>
    </>
  );
}
