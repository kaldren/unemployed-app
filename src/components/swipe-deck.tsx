"use client";

import { Heart, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { DailyProgress, MatchCelebration } from "@/components/engagement";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { dailyProgress, liveStreak, type Streak } from "@/lib/engagement/streak";
import { dragRotation, SWIPE_ERROR, swipeDecision, type SwipeResult } from "@/lib/matching/swipe";

const EXIT_MS = 200;

type DeckCard = { id: string; label: string; content: ReactNode };

// Today's activity from the server, for the progress bar and streak.
export type DailyActivity = { streak: Streak; swipedToday: number };

// One card at a time: drag it right (or press →, or "Like") to like, left to pass.
// Swipes save in the background, in order; when the deck runs out it asks the server for more.
export function SwipeDeck({
  cards,
  onSwipe,
  matchesHref,
  empty,
  daily,
}: {
  cards: DeckCard[];
  onSwipe: (id: string, liked: boolean) => Promise<SwipeResult>;
  matchesHref: Route;
  empty: ReactNode;
  daily?: DailyActivity;
}) {
  const router = useRouter();
  // The deck and the position in it change together, so a late advance can't skip a card of a newer deck.
  const [{ deck, index }, setPosition] = useState({ deck: cards, index: 0 });
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<boolean | null>(null);
  const [matched, setMatched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const drag = useRef<{ startX: number } | null>(null);
  const [width, setWidth] = useState(400);
  // Swipes on this deck; the server's `daily` already counts the ones before it.
  const [{ activity, swiped }, setActivity] = useState({ activity: daily, swiped: 0 });

  // A refresh brings a new deck from the server, without the cards already swiped.
  if (cards !== deck) {
    setPosition({ deck: cards, index: 0 });
    setActivity({ activity: daily, swiped: 0 });
    setExiting(null);
    setDx(0);
  }

  const card = deck[index];
  const next = deck[index + 1];

  function refresh() {
    startRefresh(async () => {
      await queue.current;
      startRefresh(() => router.refresh());
    });
  }

  // Returns whether the swipe was taken.
  function decide(liked: boolean) {
    if (!card || exiting !== null) return false;
    setExiting(liked);
    setActivity((a) => ({ ...a, swiped: a.swiped + 1 }));
    setMatched(false);
    setError(null);
    queue.current = queue.current.then(async () => {
      const result = await onSwipe(card.id, liked).catch((): SwipeResult => ({ status: "error", message: "" }));
      if (result.status === "ok") {
        if (result.matched) setMatched(true);
      } else {
        setError(result.message || SWIPE_ERROR);
        refresh();
      }
    });
    setTimeout(() => {
      setPosition((p) => (p.deck === deck ? { ...p, index: p.index + 1 } : p));
      setDx(0);
      setExiting(null);
      if (index + 1 >= deck.length) refresh();
    }, EXIT_MS);
    return true;
  }

  // Keep the latest decide() for the key listener.
  const decideRef = useRef(decide);
  useEffect(() => {
    decideRef.current = decide;
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      if (decideRef.current(event.key === "ArrowRight")) event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (exiting !== null || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX };
    setWidth(event.currentTarget.offsetWidth);
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag.current) setDx(event.clientX - drag.current.startX);
  }

  function onPointerEnd() {
    if (!drag.current) return;
    const liked = swipeDecision(dx, width);
    drag.current = null;
    setDragging(false);
    if (liked === null) setDx(0);
    else decide(liked);
  }

  // The browser took the gesture over (e.g. to scroll): snap back rather than decide.
  function onPointerCancel() {
    drag.current = null;
    setDragging(false);
    setDx(0);
  }

  const remaining = Math.max(0, deck.length - index - (exiting === null ? 0 : 1));
  const reviewed = (activity?.swipedToday ?? 0) + swiped;
  const streak = activity ? liveStreak(activity.streak, swiped) : 0;

  const offset = exiting === null ? dx : exiting ? width * 1.5 : -width * 1.5;
  const hint = Math.min(1, Math.abs(offset) / 120);

  return (
    <div className="flex flex-col gap-6">
      {activity && !(refreshing && !card) && (
        <DailyProgress
          reviewed={reviewed}
          remaining={remaining}
          value={dailyProgress(reviewed, remaining)}
          streak={streak}
          streakJustGrew={!activity.streak.activeToday && swiped > 0}
        />
      )}
      {matched && <MatchCelebration href={matchesHref} onDismiss={() => setMatched(false)} />}
      {error && <Alert variant="destructive">{error}</Alert>}

      {card ? (
        <>
          <div className="relative">
            {next && (
              <Card
                aria-hidden
                className="pointer-events-none absolute inset-0 translate-y-3 scale-95 opacity-60"
              >
                {next.content}
              </Card>
            )}
            <Card
              key={card.id}
              role="group"
              aria-roledescription="card"
              aria-label={card.label}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerCancel}
              className={cn(
                "relative cursor-grab touch-pan-y select-none",
                dragging ? "cursor-grabbing" : "transition-transform duration-200 motion-reduce:transition-none",
              )}
              style={{ transform: `translateX(${offset}px) rotate(${dragRotation(offset, width)}deg)` }}
            >
              <SwipeHint className="left-6 border-success text-success" visible={offset > 0} strength={hint}>
                Like
              </SwipeHint>
              <SwipeHint className="right-6 border-destructive text-destructive" visible={offset < 0} strength={hint}>
                Pass
              </SwipeHint>
              {card.content}
            </Card>
          </div>
          <div className="sticky bottom-4 flex justify-center gap-3">
            <Button variant="outline" size="lg" onClick={() => decide(false)} disabled={exiting !== null}>
              <X aria-hidden />
              Pass
            </Button>
            <Button variant="spark" size="lg" onClick={() => decide(true)} disabled={exiting !== null}>
              <Heart aria-hidden className="fill-current" />
              Like
            </Button>
          </div>
        </>
      ) : refreshing ? (
        <p className="text-sm text-muted-foreground">Loading more…</p>
      ) : (
        empty
      )}
    </div>
  );
}

function SwipeHint({
  className,
  visible,
  strength,
  children,
}: {
  className: string;
  visible: boolean;
  strength: number;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-4 z-10 rounded-full border-2 bg-card px-3 py-1 text-sm font-semibold",
        className,
      )}
      style={{ opacity: visible ? strength : 0 }}
    >
      {children}
    </span>
  );
}
