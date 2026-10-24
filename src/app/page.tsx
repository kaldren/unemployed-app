import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { JobCardBody } from "@/components/match-cards";
import { PageLoading } from "@/components/page-loading";
import { SwipeDeck } from "@/components/swipe-deck";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getMissingItems } from "@/lib/candidate/completeness";
import { getCandidateProfile } from "@/lib/candidate/queries";
import { getJobDeck } from "@/lib/matching/queries";
import { HOME_PATH, MATCHES_PATH } from "@/lib/portal";
import { swipeJob } from "./actions";

export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Jobs />
    </Suspense>
  );
}

async function Jobs() {
  const user = await getCurrentUser();
  if (user.type === "employer") redirect(HOME_PATH.employer);
  // Candidates can't be matched until their profile is complete.
  const [profile, deck] = await Promise.all([getCandidateProfile(user.id), getJobDeck(user.id)]);
  if (getMissingItems(profile).length > 0) redirect("/profile");

  return (
    <>
      <AppHeader user={user} />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">Jobs for you</h1>
          <SwipeDeck
            cards={deck.map((job) => ({
              id: job.id,
              label: `${job.title} at ${job.companyName}`,
              content: <JobCardBody job={job} />,
            }))}
            onSwipe={swipeJob}
            matchesHref={MATCHES_PATH.candidate}
            empty={
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  You&apos;ve seen every job for now. New ones show up here as companies post them.
                </p>
                <Button asChild variant="outline">
                  <Link href="/profile">Edit your profile</Link>
                </Button>
              </div>
            }
          />
        </div>
      </main>
    </>
  );
}
