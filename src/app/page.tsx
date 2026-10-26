import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { JobCardBody } from "@/components/match-cards";
import { PageLoading } from "@/components/page-loading";
import { SwipeDeck } from "@/components/swipe-deck";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getSessionUserId } from "@/lib/auth";
import { getMissingItems } from "@/lib/candidate/completeness";
import { getCandidateProfile } from "@/lib/candidate/queries";
import { computeStreak } from "@/lib/engagement/streak";
import { getJobDeck, getSwipeActivity } from "@/lib/matching/queries";
import { refreshMatches } from "@/lib/matching/run";
import { HOME_PATH, MATCHES_PATH } from "@/lib/portal";
import { swipeJob } from "./actions";
import { Landing } from "./landing";

export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Jobs />
    </Suspense>
  );
}

async function Jobs() {
  // Visitors get the landing page; signed-in candidates their deck.
  if (!(await getSessionUserId())) return <Landing />;
  const user = await getCurrentUser();
  if (user.type === "employer") redirect(HOME_PATH.employer);
  // Candidates can't be matched until their profile is complete.
  const [profile, deck, activity] = await Promise.all([
    getCandidateProfile(user.id),
    getJobDeck(user.id),
    getSwipeActivity(user.id),
  ]);
  if (getMissingItems(profile).length > 0) redirect("/profile");
  refreshMatches({ candidateId: user.id });
  const firstName = user.fullName?.split(" ")[0];

  return (
    <>
      <AppHeader user={user} />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            {firstName && <p className="text-sm font-medium text-primary">{greeting()}, {firstName}</p>}
            <h1 className="text-4xl font-semibold tracking-tight text-balance">Jobs for you</h1>
            <p className="text-base text-muted-foreground">
              Only jobs our AI matched to your profile. A company sees you once it matches you too.
            </p>
          </div>
          <SwipeDeck
            cards={deck.map((job) => ({
              id: job.id,
              label: `${job.title} at ${job.companyName}`,
              content: <JobCardBody job={job} />,
            }))}
            onSwipe={swipeJob}
            matchesHref={MATCHES_PATH.candidate}
            daily={{ streak: computeStreak(activity.activeDays, new Date()), swipedToday: activity.swipedToday }}
            empty={
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-6 py-10 text-center shadow-sm ring-1 ring-border">
                <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
                  <CalendarClock aria-hidden className="size-7" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-lg font-semibold">New matches land every morning</h2>
                  <p className="text-sm text-muted-foreground">
                    No more matches for now. When our AI finds a job that fits your profile, it shows up here.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/profile">Sharpen your profile</Link>
                </Button>
              </div>
            }
          />
        </div>
      </main>
    </>
  );
}

// Server time is UTC; close enough for a friendly hello in our first market.
function greeting() {
  const hour = new Date().getUTCHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
