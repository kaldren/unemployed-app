// Daily streaks: days in a row (UTC) with at least one swipe.

const DAY_MS = 86_400_000;

// "2026-10-27" for the UTC day a moment falls on.
export function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export type Streak = {
  // Days in a row, ending today if active today, else yesterday. 0 when broken.
  days: number;
  activeToday: boolean;
};

// `activeDays` are UTC days ("YYYY-MM-DD") with a swipe, in any order.
export function computeStreak(activeDays: string[], now: Date): Streak {
  const days = new Set(activeDays);
  const today = utcDay(now);
  const activeToday = days.has(today);
  let cursor = now.getTime() - (activeToday ? 0 : DAY_MS);
  let count = 0;
  while (days.has(utcDay(new Date(cursor)))) {
    count++;
    cursor -= DAY_MS;
  }
  return { days: count, activeToday };
}

// What the streak shows after this visit's swipes: the first swipe today extends it by one.
export function liveStreak(streak: Streak, swipedThisVisit: number) {
  return streak.activeToday || swipedThisVisit === 0 ? streak.days : streak.days + 1;
}

// Share of today's deck reviewed, 0–100. An empty deck with nothing left counts as done.
export function dailyProgress(reviewed: number, remaining: number) {
  const total = reviewed + remaining;
  return total === 0 ? 100 : Math.round((reviewed / total) * 100);
}
