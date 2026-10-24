import { describe, expect, it } from "vitest";
import { dragRotation, swipeDecision, swipeThreshold } from "./swipe";

describe("swipeThreshold", () => {
  it("is 30% of narrow cards and caps at 120px", () => {
    expect(swipeThreshold(300)).toBe(90);
    expect(swipeThreshold(800)).toBe(120);
  });
});

describe("swipeDecision", () => {
  it("likes past the threshold to the right", () => {
    expect(swipeDecision(120, 600)).toBe(true);
  });

  it("passes past the threshold to the left", () => {
    expect(swipeDecision(-90, 300)).toBe(false);
  });

  it("snaps back for short drags", () => {
    expect(swipeDecision(89, 300)).toBeNull();
    expect(swipeDecision(-50, 600)).toBeNull();
    expect(swipeDecision(0, 600)).toBeNull();
  });
});

describe("dragRotation", () => {
  it("tilts with the drag and clamps at 12°", () => {
    expect(dragRotation(150, 600)).toBe(5);
    expect(dragRotation(-600, 600)).toBe(-12);
    expect(dragRotation(10, 0)).toBe(0);
  });
});
