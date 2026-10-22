import {
  countActivePatterns,
  countMasteredPatterns,
  countSimilarCorrect,
  countSimilarPracticed,
  formatFact,
  getMostMissedOperations,
  getTopMissedFacts,
} from "./mistakeStatistics";
import type { MistakePattern } from "../types/mistake";
import type { PracticeAttempt } from "../types/session";

function makePattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: "p1",
    operation: "addition",
    firstOperand: 2,
    secondOperand: 3,
    correctAnswer: 5,
    difficulty: 1,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: "2026-01-01T10:00:00.000Z",
    mastered: false,
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: "a1",
    questionId: "q1",
    operation: "addition",
    firstOperand: 2,
    secondOperand: 3,
    correctAnswer: 5,
    selectedAnswer: 5,
    selfReportedCorrect: true,
    difficulty: 1,
    source: "regular",
    attemptedAt: "2026-01-01T10:00:00.000Z",
    sessionId: "s1",
    ...overrides,
  };
}

describe("pattern counts", () => {
  const patterns = [
    makePattern({ id: "a" }),
    makePattern({ id: "b", mastered: true }),
    makePattern({ id: "c", mastered: true }),
  ];

  it("counts active patterns", () => {
    expect(countActivePatterns(patterns)).toBe(1);
  });

  it("counts mastered patterns", () => {
    expect(countMasteredPatterns(patterns)).toBe(2);
  });

  it("returns 0 for no patterns", () => {
    expect(countActivePatterns([])).toBe(0);
    expect(countMasteredPatterns([])).toBe(0);
  });
});

describe("getMostMissedOperations", () => {
  it("returns an empty list when there are no patterns", () => {
    expect(getMostMissedOperations([])).toEqual([]);
  });

  it("sums incorrect counts per operation", () => {
    const patterns = [
      makePattern({ id: "a", operation: "addition", incorrectCount: 2 }),
      makePattern({ id: "b", operation: "multiplication", incorrectCount: 2 }),
      makePattern({ id: "c", operation: "multiplication", incorrectCount: 3 }),
    ];
    expect(getMostMissedOperations(patterns)).toEqual(["multiplication"]);
  });

  it("returns every tied operation in the standard order", () => {
    const patterns = [
      makePattern({ id: "a", operation: "division", incorrectCount: 4 }),
      makePattern({ id: "b", operation: "subtraction", incorrectCount: 4 }),
      makePattern({ id: "c", operation: "addition", incorrectCount: 1 }),
    ];
    expect(getMostMissedOperations(patterns)).toEqual(["subtraction", "division"]);
  });
});

describe("getTopMissedFacts", () => {
  it("sorts by incorrect count, highest first", () => {
    const patterns = [
      makePattern({ id: "low", incorrectCount: 1 }),
      makePattern({ id: "high", incorrectCount: 5 }),
      makePattern({ id: "mid", incorrectCount: 3 }),
    ];
    expect(getTopMissedFacts(patterns).map((pattern) => pattern.id)).toEqual([
      "high",
      "mid",
      "low",
    ]);
  });

  it("breaks ties with the more recent miss first", () => {
    const patterns = [
      makePattern({ id: "older", incorrectCount: 2, lastIncorrectAt: "2026-01-01T00:00:00.000Z" }),
      makePattern({ id: "newer", incorrectCount: 2, lastIncorrectAt: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(getTopMissedFacts(patterns).map((pattern) => pattern.id)).toEqual(["newer", "older"]);
  });

  it("limits to five by default and honors a custom limit", () => {
    const patterns = Array.from({ length: 8 }, (_, index) =>
      makePattern({ id: `p${index}`, incorrectCount: index + 1 }),
    );
    expect(getTopMissedFacts(patterns)).toHaveLength(5);
    expect(getTopMissedFacts(patterns, 2)).toHaveLength(2);
  });

  it("returns an empty list for no patterns and does not change the input", () => {
    expect(getTopMissedFacts([])).toEqual([]);
    const patterns = [
      makePattern({ id: "a", incorrectCount: 1 }),
      makePattern({ id: "b", incorrectCount: 2 }),
    ];
    getTopMissedFacts(patterns);
    expect(patterns.map((pattern) => pattern.id)).toEqual(["a", "b"]);
  });
});

describe("similar question counts", () => {
  const attempts = [
    makeAttempt({ id: "1", source: "regular" }),
    makeAttempt({ id: "2", source: "mistake-review", selfReportedCorrect: true }),
    makeAttempt({ id: "3", source: "mistake-review", selfReportedCorrect: false }),
    makeAttempt({ id: "4", source: "mistake-review", selfReportedCorrect: true }),
  ];

  it("counts review attempts as practiced", () => {
    expect(countSimilarPracticed(attempts)).toBe(3);
  });

  it("counts review attempts answered correctly", () => {
    expect(countSimilarCorrect(attempts)).toBe(2);
  });

  it("returns 0 for no attempts", () => {
    expect(countSimilarPracticed([])).toBe(0);
    expect(countSimilarCorrect([])).toBe(0);
  });
});

describe("formatFact", () => {
  it("formats a multiplication fact", () => {
    expect(
      formatFact(
        makePattern({
          operation: "multiplication",
          firstOperand: 7,
          secondOperand: 8,
          correctAnswer: 56,
        }),
      ),
    ).toBe("7 × 8 = 56");
  });

  it("uses the right symbol for each operation", () => {
    expect(
      formatFact(
        makePattern({
          operation: "division",
          firstOperand: 12,
          secondOperand: 4,
          correctAnswer: 3,
        }),
      ),
    ).toBe("12 ÷ 4 = 3");
    expect(
      formatFact(
        makePattern({
          operation: "subtraction",
          firstOperand: 9,
          secondOperand: 4,
          correctAnswer: 5,
        }),
      ),
    ).toBe("9 − 4 = 5");
  });
});
