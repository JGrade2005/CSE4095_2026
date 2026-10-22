import { afterEach, describe, expect, it, vi } from "vitest";
import { getActivePatterns, rankPatterns, scorePattern } from "./reviewPriority";
import type { MistakePattern } from "../types/mistake";

const now = new Date("2026-03-10T12:00:00.000Z");
const THRESHOLD = 3;

function pattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: "p",
    operation: "multiplication",
    firstOperand: 7,
    secondOperand: 8,
    correctAnswer: 56,
    difficulty: 2,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: "2026-03-10T12:00:00.000Z",
    mastered: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getActivePatterns", () => {
  it("excludes mastered patterns", () => {
    const active = pattern({ id: "a" });
    const mastered = pattern({ id: "m", mastered: true });
    expect(getActivePatterns([active, mastered])).toEqual([active]);
  });
});

describe("rankPatterns", () => {
  it("ranks a higher incorrectCount first", () => {
    const few = pattern({ id: "few", incorrectCount: 1 });
    const many = pattern({ id: "many", incorrectCount: 4 });
    expect(rankPatterns([few, many], now, THRESHOLD).map((p) => p.id)).toEqual(["many", "few"]);
  });

  it("ranks a more recent miss first", () => {
    const old = pattern({ id: "old", lastIncorrectAt: "2026-02-01T12:00:00.000Z" });
    const recent = pattern({ id: "recent", lastIncorrectAt: "2026-03-09T12:00:00.000Z" });
    expect(rankPatterns([old, recent], now, THRESHOLD).map((p) => p.id)).toEqual(["recent", "old"]);
  });

  it("ranks fewer similar-correct answers first", () => {
    const progressed = pattern({ id: "progressed", similarCorrectCount: 2 });
    const fresh = pattern({ id: "fresh", similarCorrectCount: 0 });
    expect(rankPatterns([progressed, fresh], now, THRESHOLD).map((p) => p.id)).toEqual([
      "fresh",
      "progressed",
    ]);
  });

  it("leaves mastered patterns out", () => {
    const ranked = rankPatterns(
      [pattern({ id: "a" }), pattern({ id: "m", mastered: true })],
      now,
      THRESHOLD,
    );
    expect(ranked.map((p) => p.id)).toEqual(["a"]);
  });

  it("randomizes ties", () => {
    const a = pattern({ id: "a" });
    const b = pattern({ id: "b" });

    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rankPatterns([a, b], now, THRESHOLD).map((p) => p.id)).toEqual(["b", "a"]);

    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(rankPatterns([a, b], now, THRESHOLD).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const input = [pattern({ id: "a" }), pattern({ id: "b", incorrectCount: 5 })];
    const copy = [...input];
    rankPatterns(input, now, THRESHOLD);
    expect(input).toEqual(copy);
  });
});

describe("scorePattern", () => {
  it("decays with the age of the last miss", () => {
    const today = scorePattern(pattern(), now, THRESHOLD);
    const monthAgo = scorePattern(
      pattern({ lastIncorrectAt: "2026-02-08T12:00:00.000Z" }),
      now,
      THRESHOLD,
    );
    expect(today).toBeGreaterThan(monthAgo);
  });

  it("does not throw on an unreadable date", () => {
    expect(
      Number.isFinite(scorePattern(pattern({ lastIncorrectAt: "nope" }), now, THRESHOLD)),
    ).toBe(true);
  });
});
