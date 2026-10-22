import { DEFAULT_SETTINGS } from "../services/defaults";
import { STORAGE_KEYS } from "../services/storageKeys";
import type { MistakePattern } from "../types/mistake";
import type { PracticeAttempt, PracticeSession } from "../types/session";
import type { AppStatistics } from "../types/statistics";

export const SEED_STATISTICS: AppStatistics = {
  attempted: 10,
  correct: 7,
  incorrect: 3,
  byOperation: {
    addition: { attempted: 4, correct: 3, incorrect: 1 },
    subtraction: { attempted: 2, correct: 2, incorrect: 0 },
    multiplication: { attempted: 3, correct: 1, incorrect: 2 },
    division: { attempted: 1, correct: 1, incorrect: 0 },
  },
  byDifficulty: {
    1: { attempted: 5, correct: 4, incorrect: 1 },
    2: { attempted: 3, correct: 2, incorrect: 1 },
    3: { attempted: 2, correct: 1, incorrect: 1 },
    4: { attempted: 0, correct: 0, incorrect: 0 },
  },
};

// Stored out of order on purpose: the page must sort them itself.
export const SEED_SESSIONS: PracticeSession[] = [
  {
    id: "s-old",
    startedAt: "2026-01-05T12:00:00.000Z",
    operations: ["addition"],
    difficulty: 1,
    sessionLength: 5,
    attempted: 4,
    correct: 3,
    incorrect: 1,
  },
  {
    id: "s-new",
    startedAt: "2026-03-20T12:00:00.000Z",
    operations: ["division", "multiplication"],
    difficulty: 3,
    sessionLength: 10,
    attempted: 3,
    correct: 2,
    incorrect: 1,
  },
  {
    id: "s-mid",
    startedAt: "2026-02-10T12:00:00.000Z",
    operations: ["subtraction"],
    difficulty: 2,
    sessionLength: 5,
    attempted: 3,
    correct: 3,
    incorrect: 0,
  },
];

function pattern(overrides: Partial<MistakePattern>): MistakePattern {
  return {
    id: "p",
    operation: "multiplication",
    firstOperand: 7,
    secondOperand: 8,
    correctAnswer: 56,
    difficulty: 2,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: "2026-03-01T12:00:00.000Z",
    mastered: false,
    ...overrides,
  };
}

export const SEED_PATTERNS: MistakePattern[] = [
  pattern({ id: "p-78", incorrectCount: 4, similarCorrectCount: 1 }),
  pattern({
    id: "p-67",
    firstOperand: 6,
    secondOperand: 7,
    correctAnswer: 42,
    incorrectCount: 2,
  }),
  pattern({
    id: "p-56",
    operation: "addition",
    firstOperand: 5,
    secondOperand: 6,
    correctAnswer: 11,
    difficulty: 1,
    incorrectCount: 3,
    similarCorrectCount: 2,
  }),
  pattern({
    id: "p-124",
    operation: "division",
    firstOperand: 12,
    secondOperand: 4,
    correctAnswer: 3,
    incorrectCount: 1,
    similarCorrectCount: 3,
    mastered: true,
  }),
];

function attempt(id: string, source: PracticeAttempt["source"], correct: boolean): PracticeAttempt {
  return {
    id,
    questionId: `q-${id}`,
    operation: "multiplication",
    firstOperand: 7,
    secondOperand: 8,
    correctAnswer: 56,
    selectedAnswer: correct ? 56 : 54,
    selfReportedCorrect: correct,
    difficulty: 2,
    source,
    attemptedAt: "2026-03-20T12:00:00.000Z",
    sessionId: "s-new",
  };
}

export const SEED_ATTEMPTS: PracticeAttempt[] = [
  attempt("a1", "regular", true),
  attempt("a2", "mistake-review", true),
  attempt("a3", "mistake-review", false),
  attempt("a4", "mistake-review", true),
  attempt("a5", "mistake-review", true),
];

export const SEED_SETTINGS = { ...DEFAULT_SETTINGS, masteryThreshold: 4, defaultDifficulty: 2 };

export function seedStorage(): void {
  localStorage.setItem(STORAGE_KEYS.statistics, JSON.stringify(SEED_STATISTICS));
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(SEED_SESSIONS));
  localStorage.setItem(STORAGE_KEYS.mistakePatterns, JSON.stringify(SEED_PATTERNS));
  localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(SEED_ATTEMPTS));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(SEED_SETTINGS));
}
