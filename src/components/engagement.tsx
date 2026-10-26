"use client";

import { Flame, PartyPopper } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Days in a row with a swipe. Encouraging only: a broken streak simply isn't shown.
export function StreakBadge({ days, pulse }: { days: number; pulse?: boolean }) {
  if (days === 0) return null;
  return (
    <span
      key={pulse ? days : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-streak-soft px-3 py-1 text-sm font-semibold text-streak-foreground",
        pulse && "animate-pop",
      )}
    >
      <Flame aria-hidden className="size-4 fill-streak text-streak" />
      {days}-day streak
    </span>
  );
}

// Today's deck as a progress bar: how many reviewed, how many left.
export function DailyProgress({
  reviewed,
  remaining,
  value,
  streak,
  streakJustGrew,
}: {
  reviewed: number;
  remaining: number;
  value: number;
  streak: number;
  streakJustGrew: boolean;
}) {
  const done = remaining === 0;
  return (
    <section aria-label="Today" className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {done ? "All caught up for today" : `${reviewed} reviewed · ${remaining} to go today`}
        </p>
        <StreakBadge days={streak} pulse={streakJustGrew} />
      </div>
      <Progress value={value} aria-label="Today's jobs reviewed" />
    </section>
  );
}

const CONFETTI = ["bg-spark-1", "bg-spark-2", "bg-spark-3", "bg-brand", "bg-streak"];

// A short, one-off burst over the page. Hidden from screen readers and under reduced motion.
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: pieces }, (_, i) => (
        <span
          key={i}
          className={cn("animate-confetti absolute -top-4 block h-3 w-2 rounded-sm", CONFETTI[i % CONFETTI.length])}
          style={
            {
              left: `${(i * 37) % 100}%`,
              "--delay": `${(i % 9) * 0.06}s`,
              "--duration": `${1.8 + (i % 5) * 0.25}s`,
              "--drift": `${((i % 7) - 3) * 30}px`,
              "--spin": `${360 + (i % 4) * 180}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

// Both sides said yes: the biggest moment in the app, so it gets the spark gradient and confetti.
export function MatchCelebration({ href, onDismiss }: { href: Route; onDismiss: () => void }) {
  return (
    <>
      <Confetti />
      <section
        role="status"
        className="animate-pop flex flex-col items-center gap-4 rounded-2xl bg-linear-to-br from-spark-1 to-spark-2 p-6 text-center text-primary-foreground shadow-sm"
      >
        <PartyPopper aria-hidden className="size-10" />
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">It&apos;s a match</h2>
          <p className="text-sm">You both said yes. Say hello while it&apos;s fresh.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="secondary">
            <Link href={href}>See how to get in touch</Link>
          </Button>
          <Button variant="ghost" className="text-primary-foreground hover:bg-card/15 hover:text-primary-foreground" onClick={onDismiss}>
            Keep swiping
          </Button>
        </div>
      </section>
    </>
  );
}
