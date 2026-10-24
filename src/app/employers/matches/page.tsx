import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployer } from "@/lib/auth";
import { listCompanyMatches } from "@/lib/matching/queries";

export const metadata: Metadata = {
  title: "Matches",
};

export default function EmployerMatchesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Matches />
    </Suspense>
  );
}

async function Matches() {
  const user = await requireEmployer();
  const matches = await listCompanyMatches(user.company.id);

  return (
    <>
      <AppHeader user={user} current="matches" />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold tracking-tight">Matches</h1>
            <p className="text-base text-muted-foreground">Candidates who want the job too. Reach out.</p>
          </div>

          {matches.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                No matches yet. Review candidates for a published job, and the ones who like it back show up here.
              </p>
              <Button asChild variant="outline">
                <Link href="/employers">See your jobs</Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Matches">
              {matches.map((match) => (
                <li key={`${match.jobId}:${match.candidateId}`}>
                  <Card size="sm">
                    <CardHeader className="grid-cols-[1fr_auto] items-center gap-x-4">
                      <div className="flex min-w-0 flex-col gap-1">
                        <CardTitle asChild>
                          <h2>{match.fullName ?? match.email}</h2>
                        </CardTitle>
                        <CardDescription>
                          {[match.headline, `for ${match.title}`].filter(Boolean).join(" · ")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {match.linkedinUrl && (
                          <Button asChild variant="ghost" size="sm">
                            <a href={match.linkedinUrl} target="_blank" rel="noreferrer">
                              LinkedIn
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <a href={`mailto:${match.email}`}>Email</a>
                        </Button>
                      </div>
                    </CardHeader>
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
