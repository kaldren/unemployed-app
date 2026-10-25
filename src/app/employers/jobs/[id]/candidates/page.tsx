import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { CandidateCardBody } from "@/components/match-cards";
import { PageLoading } from "@/components/page-loading";
import { SwipeDeck } from "@/components/swipe-deck";
import { Button } from "@/components/ui/button";
import { requireEmployer } from "@/lib/auth";
import { getJob } from "@/lib/jobs/queries";
import { getCandidateDeck } from "@/lib/matching/queries";
import { refreshMatches } from "@/lib/matching/run";
import { MATCHES_PATH } from "@/lib/portal";
import { swipeCandidate } from "./actions";

export const metadata: Metadata = {
  title: "Candidates",
};

export default function CandidatesPage({ params }: PageProps<"/employers/jobs/[id]/candidates">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Candidates params={params} />
    </Suspense>
  );
}

async function Candidates({ params }: Pick<PageProps<"/employers/jobs/[id]/candidates">, "params">) {
  const [user, { id }] = await Promise.all([requireEmployer(), params]);
  const job = await getJob(user.company.id, id);
  if (!job) notFound();

  const approved = user.company.status === "approved";
  const open = job.status === "open";
  const deck = approved && open ? await getCandidateDeck(job.id, user.company.domain) : [];
  if (approved && open) refreshMatches({ jobId: job.id });

  return (
    <>
      <AppHeader user={user} />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold tracking-tight text-balance">Candidates</h1>
            <p className="text-base text-muted-foreground">
              Only candidates our AI matched to{" "}
              <span className="font-medium text-foreground">{job.title || "Untitled job"}</span>. Names and contact
              details appear once you match.
            </p>
          </div>
          {!approved ? (
            <p className="text-sm text-muted-foreground">
              You can review candidates once {user.company.name} is verified.
            </p>
          ) : !open ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Publish this job to review candidates.</p>
              <Button asChild variant="outline">
                <Link href={`/employers/jobs/${job.id}`}>Edit job</Link>
              </Button>
            </div>
          ) : (
            <SwipeDeck
              cards={deck.map((candidate) => ({
                id: candidate.id,
                label: candidate.headline ?? "Candidate",
                content: <CandidateCardBody candidate={candidate} />,
              }))}
              onSwipe={swipeCandidate.bind(null, job.id)}
              matchesHref={MATCHES_PATH.employer}
              empty={
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-muted-foreground">
                    No more matches for now. When our AI finds a candidate who fits this job, they show up here.
                  </p>
                  <Button asChild variant="outline">
                    <Link href={MATCHES_PATH.employer}>See matches</Link>
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </main>
    </>
  );
}
