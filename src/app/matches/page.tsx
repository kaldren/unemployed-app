import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCandidate } from "@/lib/auth";
import { listCandidateMatches } from "@/lib/matching/queries";

export const metadata: Metadata = {
  title: "Matches",
};

export default function MatchesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Matches />
    </Suspense>
  );
}

async function Matches() {
  const user = await requireCandidate();
  const matches = await listCandidateMatches(user.id);

  return (
    <>
      <AppHeader user={user} current="matches" />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold tracking-tight">Matches</h1>
            <p className="text-base text-muted-foreground">Jobs where the company liked you back. Say hello.</p>
          </div>

          {matches.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                No matches yet. Like jobs you&apos;d want, and you&apos;ll see them here when a company likes you
                back.
              </p>
              <Button asChild variant="outline">
                <Link href="/">See jobs</Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Matches">
              {matches.map((match) => (
                <li key={match.jobId}>
                  <Card size="sm">
                    <CardHeader className="grid-cols-[1fr_auto] items-center gap-x-4">
                      <div className="flex flex-col gap-1">
                        <CardTitle asChild>
                          <h2>{match.title}</h2>
                        </CardTitle>
                        <CardDescription>
                          {match.companyName}
                          {match.contactEmail && ` · ${match.contactName ?? match.contactEmail}`}
                        </CardDescription>
                      </div>
                      {match.contactEmail && (
                        <Button asChild variant="outline" size="sm">
                          <a href={`mailto:${match.contactEmail}`}>Email</a>
                        </Button>
                      )}
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
