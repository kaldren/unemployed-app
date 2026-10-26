import { describe, expect, it } from "vitest";
import { computeStreak, dailyProgress, liveStreak, utcDay } from "./streak";

const now = new Date("2026-10-27T15:00:00Z");

describe("utcDay", () => {
  it("uses the UTC calendar day", () => {
    expect(utcDay(new Date("2026-10-27T23:59:59Z"))).toBe("2026-10-27");
    expect(utcDay(new Date("2026-10-28T00:00:00Z"))).toBe("2026-10-28");
  });
});

describe("computeStreak", () => {
  it("counts days in a row ending today", () => {
    expect(computeStreak(["2026-10-25", "2026-10-27", "2026-10-26"], now)).toEqual({ days: 3, activeToday: true });
  });

  it("keeps a streak that ended yesterday alive, not active today", () => {
    expect(computeStreak(["2026-10-26", "2026-10-25"], now)).toEqual({ days: 2, activeToday: false });
  });

  it("stops at the first missed day", () => {
    expect(computeStreak(["2026-10-27", "2026-10-25", "2026-10-24"], now)).toEqual({ days: 1, activeToday: true });
  });

  it("is broken after a full missed day", () => {
    expect(computeStreak(["2026-10-25"], now)).toEqual({ days: 0, activeToday: false });
    expect(computeStreak([], now)).toEqual({ days: 0, activeToday: false });
  });
});

describe("liveStreak", () => {
  it("adds today once the first swipe of the day lands", () => {
    expect(liveStreak({ days: 2, activeToday: false }, 0)).toBe(2);
    expect(liveStreak({ days: 2, activeToday: false }, 3)).toBe(3);
    expect(liveStreak({ days: 0, activeToday: false }, 1)).toBe(1);
  });

  it("doesn't double count a day already active", () => {
    expect(liveStreak({ days: 4, activeToday: true }, 2)).toBe(4);
  });
});

describe("dailyProgress", () => {
  it("is the reviewed share of today's jobs", () => {
    expect(dailyProgress(1, 3)).toBe(25);
    expect(dailyProgress(2, 1)).toBe(67);
  });

  it("is done when nothing is left", () => {
    expect(dailyProgress(4, 0)).toBe(100);
    expect(dailyProgress(0, 0)).toBe(100);
  });
});
