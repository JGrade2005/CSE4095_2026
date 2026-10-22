import { createEmptyStatistics } from "./defaults";
import { applyAttemptToStatistics, calculateAccuracy, summarizeSession } from "./statisticsService";
import type { PracticeAttempt, PracticeSession } from "../types/session";
import type { AppStatistics } from "../types/statistics";

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

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "s1",
    startedAt: "2026-01-01T10:00:00.000Z",
    operations: ["addition"],
    difficulty: 1,
    sessionLength: 10,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    ...overrides,
  };
}

describe("calculateAccuracy", () => {
  it("returns 0 for zero attempts and never NaN", () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
    expect(Number.isNaN(calculateAccuracy(0, 0))).toBe(false);
  });

  it("returns 100 when all are correct", () => {
    expect(calculateAccuracy(5, 5)).toBe(100);
  });

  it("returns 0 when all are incorrect", () => {
    expect(calculateAccuracy(0, 5)).toBe(0);
  });

  it("rounds 2 of 3 to 67", () => {
    expect(calculateAccuracy(2, 3)).toBe(67);
  });
});

describe("applyAttemptToStatistics", () => {
  it("updates overall, operation and level counts for a correct attempt", () => {
    const result = applyAttemptToStatistics(
      createEmptyStatistics(),
      makeAttempt({ operation: "multiplication", difficulty: 3 }),
    );
    expect(result).toMatchObject({ attempted: 1, correct: 1, incorrect: 0 });
    expect(result.byOperation.multiplication).toEqual({ attempted: 1, correct: 1, incorrect: 0 });
    expect(result.byDifficulty[3]).toEqual({ attempted: 1, correct: 1, incorrect: 0 });
    expect(result.byOperation.addition.attempted).toBe(0);
    expect(result.byDifficulty[1].attempted).toBe(0);
  });

  it("counts a self-reported incorrect attempt as incorrect", () => {
    const result = applyAttemptToStatistics(
      createEmptyStatistics(),
      makeAttempt({ operation: "division", difficulty: 2, selfReportedCorrect: false }),
    );
    expect(result).toMatchObject({ attempted: 1, correct: 0, incorrect: 1 });
    expect(result.byOperation.division).toEqual({ attempted: 1, correct: 0, incorrect: 1 });
    expect(result.byDifficulty[2]).toEqual({ attempted: 1, correct: 0, incorrect: 1 });
  });

  it("accumulates over several attempts", () => {
    let stats: AppStatistics = createEmptyStatistics();
    stats = applyAttemptToStatistics(stats, makeAttempt());
    stats = applyAttemptToStatistics(stats, makeAttempt({ selfReportedCorrect: false }));
    stats = applyAttemptToStatistics(stats, makeAttempt());
    expect(stats.attempted).toBe(3);
    expect(calculateAccuracy(stats.correct, stats.attempted)).toBe(67);
  });

  it("does not change its inputs", () => {
    const stats = createEmptyStatistics();
    const attempt = makeAttempt();
    const statsCopy = structuredClone(stats);
    const attemptCopy = structuredClone(attempt);
    const result = applyAttemptToStatistics(stats, attempt);
    expect(stats).toEqual(statsCopy);
    expect(attempt).toEqual(attemptCopy);
    expect(result).not.toBe(stats);
    expect(result.byOperation).not.toBe(stats.byOperation);
  });
});

describe("summarizeSession", () => {
  it("returns the counts with accuracy", () => {
    expect(summarizeSession(makeSession({ attempted: 3, correct: 2, incorrect: 1 }))).toEqual({
      attempted: 3,
      correct: 2,
      incorrect: 1,
      accuracy: 67,
    });
  });

  it("returns 0% for a session with no attempts", () => {
    expect(summarizeSession(makeSession()).accuracy).toBe(0);
  });
});
