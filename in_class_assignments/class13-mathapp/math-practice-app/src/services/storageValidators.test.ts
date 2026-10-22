import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, createEmptyStatistics } from "./defaults";
import {
  validateAttempts,
  validateMistakePatterns,
  validateSessions,
  validateSettings,
  validateStatistics,
  validateVersionRecord,
} from "./storageValidators";
import type { MistakePattern } from "../types/mistake";
import type { PracticeAttempt, PracticeSession } from "../types/session";

const attempt: PracticeAttempt = {
  id: "a1",
  questionId: "q1",
  operation: "addition",
  firstOperand: 3,
  secondOperand: 4,
  correctAnswer: 7,
  selectedAnswer: 8,
  selfReportedCorrect: false,
  difficulty: 1,
  source: "regular",
  attemptedAt: "2026-01-01T10:00:00.000Z",
  sessionId: "s1",
};

const session: PracticeSession = {
  id: "s1",
  startedAt: "2026-01-01T10:00:00.000Z",
  operations: ["addition"],
  difficulty: 1,
  sessionLength: 10,
  attempted: 0,
  correct: 0,
  incorrect: 0,
};

const pattern: MistakePattern = {
  id: "p1",
  operation: "multiplication",
  firstOperand: 7,
  secondOperand: 8,
  correctAnswer: 56,
  difficulty: 2,
  incorrectCount: 1,
  similarCorrectCount: 0,
  lastIncorrectAt: "2026-01-01T10:00:00.000Z",
  mastered: false,
};

describe("validateSettings", () => {
  it("returns defaults for a non-object", () => {
    expect(validateSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(validateSettings("text")).toEqual(DEFAULT_SETTINGS);
    expect(validateSettings([1])).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid values", () => {
    const stored = {
      soundEffectsEnabled: false,
      cardAnimationEnabled: false,
      showExplanations: false,
      defaultSessionLength: "continuous",
      defaultDifficulty: 3,
      defaultOperations: ["division", "addition"],
      masteryThreshold: 5,
      allowNegativeSubtraction: true,
      feedbackMessagesEnabled: false,
    };
    expect(validateSettings(stored)).toEqual({
      ...stored,
      defaultOperations: ["addition", "division"],
    });
  });

  it("falls back to the default for each bad field and keeps the good ones", () => {
    const result = validateSettings({
      soundEffectsEnabled: "yes",
      cardAnimationEnabled: false,
      showExplanations: 1,
      defaultSessionLength: -5,
      defaultDifficulty: 9,
      defaultOperations: [],
      masteryThreshold: 2.5,
      allowNegativeSubtraction: "no",
      feedbackMessagesEnabled: "off",
    });
    expect(result).toEqual({ ...DEFAULT_SETTINGS, cardAnimationEnabled: false });
  });

  it.each([0, 11, 1.5, "3", null])("rejects mastery threshold %p", (value) => {
    expect(validateSettings({ masteryThreshold: value }).masteryThreshold).toBe(3);
  });

  it.each([1, 10])("accepts mastery threshold %p", (value) => {
    expect(validateSettings({ masteryThreshold: value }).masteryThreshold).toBe(value);
  });

  it("drops unknown operations and falls back when none remain", () => {
    expect(
      validateSettings({ defaultOperations: ["division", "power"] }).defaultOperations,
    ).toEqual(["division"]);
    expect(validateSettings({ defaultOperations: ["power"] }).defaultOperations).toEqual([
      "addition",
    ]);
    expect(validateSettings({ defaultOperations: "addition" }).defaultOperations).toEqual([
      "addition",
    ]);
  });

  it.each([5, 10, 20, "continuous"])("accepts session length %p", (value) => {
    expect(validateSettings({ defaultSessionLength: value }).defaultSessionLength).toBe(value);
  });

  it.each([0, 2.5, "ten", "Continuous"])("rejects session length %p", (value) => {
    expect(validateSettings({ defaultSessionLength: value }).defaultSessionLength).toBe(10);
  });

  it("does not share the defaults operations array", () => {
    const result = validateSettings(null);
    result.defaultOperations.push("division");
    expect(DEFAULT_SETTINGS.defaultOperations).toEqual(["addition"]);
  });
});

describe("array validators", () => {
  it("keep valid entries and drop invalid ones", () => {
    expect(validateAttempts([attempt, { ...attempt, id: 5 }, "junk", null])).toEqual([attempt]);
    expect(validateSessions([session, { ...session, difficulty: 7 }, 3])).toEqual([session]);
    expect(validateMistakePatterns([{ ...pattern, mastered: "no" }, pattern])).toEqual([pattern]);
  });

  it("reset to an empty list for a wrong top-level shape", () => {
    expect(validateAttempts({ a: 1 })).toEqual([]);
    expect(validateSessions("nope")).toEqual([]);
    expect(validateMistakePatterns(null)).toEqual([]);
  });

  it("require every attempt field with the right type", () => {
    expect(validateAttempts([{ ...attempt, selectedAnswer: "8" }])).toEqual([]);
    expect(validateAttempts([{ ...attempt, selfReportedCorrect: undefined }])).toEqual([]);
    expect(validateAttempts([{ ...attempt, source: "other" }])).toEqual([]);
    expect(validateAttempts([{ ...attempt, attemptedAt: "not a date" }])).toEqual([]);
  });

  it("accept an optional mistake pattern id but reject a malformed one", () => {
    const review = { ...attempt, source: "mistake-review", mistakePatternId: "p1" };
    expect(validateAttempts([review])).toEqual([review]);
    expect(validateAttempts([{ ...review, mistakePatternId: 7 }])).toEqual([]);
  });

  it("accept sessions with completion details and continuous length", () => {
    const done = {
      ...session,
      sessionLength: "continuous",
      completedAt: "2026-01-01T10:05:00.000Z",
    };
    expect(validateSessions([done])).toEqual([done]);
    expect(validateSessions([{ ...session, completedAt: 12 }])).toEqual([]);
  });

  it("reject negative or fractional counts", () => {
    expect(validateSessions([{ ...session, attempted: -1 }])).toEqual([]);
    expect(validateMistakePatterns([{ ...pattern, incorrectCount: 1.5 }])).toEqual([]);
  });
});

describe("validateStatistics", () => {
  it("keeps valid statistics", () => {
    const stats = createEmptyStatistics();
    stats.attempted = 4;
    stats.byOperation.addition.attempted = 4;
    expect(validateStatistics(stats)).toEqual(stats);
  });

  it("resets to empty statistics for a wrong shape", () => {
    expect(validateStatistics(null)).toEqual(createEmptyStatistics());
    expect(validateStatistics({ attempted: 1 })).toEqual(createEmptyStatistics());
  });

  it("resets when any count is negative or not an integer", () => {
    const negative = createEmptyStatistics();
    negative.byDifficulty[3].correct = -1;
    const fractional = createEmptyStatistics();
    fractional.byOperation.division.incorrect = 0.5;
    const missing = createEmptyStatistics() as unknown as Record<string, Record<string, unknown>>;
    delete missing.byOperation.subtraction;

    expect(validateStatistics(negative)).toEqual(createEmptyStatistics());
    expect(validateStatistics(fractional)).toEqual(createEmptyStatistics());
    expect(validateStatistics(missing)).toEqual(createEmptyStatistics());
  });
});

describe("validateVersionRecord", () => {
  it("reads a valid version and treats anything else as 0", () => {
    expect(validateVersionRecord({ version: 1 })).toEqual({ version: 1 });
    expect(validateVersionRecord({ version: "1" })).toEqual({ version: 0 });
    expect(validateVersionRecord({ version: -1 })).toEqual({ version: 0 });
    expect(validateVersionRecord(null)).toEqual({ version: 0 });
  });
});
