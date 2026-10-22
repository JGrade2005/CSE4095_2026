import { describe, expect, it } from "vitest";
import {
  buildReviewQuestion,
  getReviewablePatterns,
  pickReviewPattern,
} from "./reviewSessionBuilder";
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
    lastIncorrectAt: "2026-03-09T12:00:00.000Z",
    mastered: false,
    ...overrides,
  };
}

const multiplicationPatterns = [
  pattern({ id: "a", firstOperand: 7, secondOperand: 8, correctAnswer: 56 }),
  pattern({ id: "b", firstOperand: 6, secondOperand: 9, correctAnswer: 54 }),
  pattern({ id: "c", firstOperand: 4, secondOperand: 7, correctAnswer: 28 }),
];

describe("getReviewablePatterns", () => {
  it("keeps only active patterns that match the operations and level", () => {
    const keep = pattern({ id: "keep" });
    const patterns = [
      keep,
      pattern({ id: "mastered", mastered: true }),
      pattern({
        id: "wrong-op",
        operation: "addition",
        firstOperand: 3,
        secondOperand: 4,
        correctAnswer: 7,
      }),
      pattern({ id: "wrong-level", difficulty: 3 }),
    ];
    expect(getReviewablePatterns(patterns, ["multiplication"], 2)).toEqual([keep]);
  });
});

describe("pickReviewPattern", () => {
  it("returns null when there are no patterns", () => {
    expect(pickReviewPattern([], now, THRESHOLD)).toBeNull();
  });

  it("mixes several patterns across many picks", () => {
    const seen = new Set<string>();
    for (let index = 0; index < 100; index++) {
      const picked = pickReviewPattern(multiplicationPatterns, now, THRESHOLD);
      if (picked) seen.add(picked.id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("does not repeat the previous pattern when another exists", () => {
    const two = multiplicationPatterns.slice(0, 2);
    for (let index = 0; index < 50; index++) {
      expect(pickReviewPattern(two, now, THRESHOLD, "a")?.id).toBe("b");
    }
  });

  it("repeats the previous pattern when it is the only one", () => {
    expect(pickReviewPattern([multiplicationPatterns[0]], now, THRESHOLD, "a")?.id).toBe("a");
  });
});

describe("buildReviewQuestion", () => {
  const config = { operations: ["multiplication" as const], difficulty: 2 as const };

  it("returns mistake-review questions tagged with a pattern id", () => {
    const ids = new Set(multiplicationPatterns.map((p) => p.id));
    for (let index = 0; index < 50; index++) {
      const question = buildReviewQuestion(multiplicationPatterns, config, now, THRESHOLD);
      expect(question?.source).toBe("mistake-review");
      expect(ids.has(question?.mistakePatternId ?? "")).toBe(true);
    }
  });

  it("uses several patterns in one session", () => {
    const seen = new Set<string>();
    let previous: string | undefined;
    for (let index = 0; index < 30; index++) {
      const question = buildReviewQuestion(
        multiplicationPatterns,
        config,
        now,
        THRESHOLD,
        {},
        previous,
      );
      previous = question?.mistakePatternId;
      if (previous) seen.add(previous);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("never picks the same pattern twice in a row when two exist", () => {
    const two = multiplicationPatterns.slice(0, 2);
    let previous: string | undefined;
    for (let index = 0; index < 30; index++) {
      const question = buildReviewQuestion(two, config, now, THRESHOLD, {}, previous);
      expect(question?.mistakePatternId).not.toBe(previous);
      previous = question?.mistakePatternId;
    }
  });

  it("ignores mastered patterns and other levels", () => {
    const patterns = [
      pattern({ id: "mastered", mastered: true }),
      pattern({ id: "other-level", difficulty: 4 }),
    ];
    expect(buildReviewQuestion(patterns, config, now, THRESHOLD)).toBeNull();
  });

  it("returns null when none are reviewable", () => {
    expect(buildReviewQuestion([], config, now, THRESHOLD)).toBeNull();
    expect(
      buildReviewQuestion(
        multiplicationPatterns,
        { ...config, operations: ["addition"] },
        now,
        THRESHOLD,
      ),
    ).toBeNull();
  });
});
