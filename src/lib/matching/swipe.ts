// Result of a like or pass, as returned by the swipe server actions.
export type SwipeResult = { status: "ok"; matched: boolean } | { status: "error"; message: string };

export const SWIPE_ERROR = "That didn't save. Please try again.";

const MAX_THRESHOLD = 120; // px

// How far a card must be dragged to count: 30% of its width, at most 120px.
export function swipeThreshold(cardWidth: number) {
  return Math.min(MAX_THRESHOLD, cardWidth * 0.3);
}

// A drag released past the threshold likes (right) or passes (left); anything shorter snaps back.
export function swipeDecision(dx: number, cardWidth: number): boolean | null {
  const threshold = swipeThreshold(cardWidth);
  if (dx >= threshold) return true;
  if (dx <= -threshold) return false;
  return null;
}

// The card tilts with the drag, up to 12°.
export function dragRotation(dx: number, cardWidth: number) {
  if (cardWidth <= 0) return 0;
  return Math.max(-12, Math.min(12, (dx / cardWidth) * 20));
}
