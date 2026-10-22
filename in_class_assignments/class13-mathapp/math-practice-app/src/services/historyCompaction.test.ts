import { beforeEach, describe, expect, it } from "vitest";
import { MATH_OPERATIONS } from "../types/question";
import type { PracticeAttempt, PracticeSession } from "../types/session";
import type { AppStatistics } from "../types/statistics";
import { createEmptyStatistics } from "./defaults";
import {
  MAX_STORED_ATTEMPTS,
  MAX_STORED_SESSIONS,
  appendAttempt,
  loadAttempts,
  loadSessions,
  loadStatistics,
  saveSession,
  saveStatistics,
} from "./practiceRecords";
import { STORAGE_KEYS } from "./storageKeys";
import { getStorageUsageBytes, resetStorageServiceState } from "./storageService";
import { applyAttemptToStatistics } from "./statisticsService";

// Normally about 80 ms. The budget only guards against pathological (e.g. quadratic) regressions,
// which take seconds; tighter limits fail spuriously when the whole suite runs in parallel.
const TIME_BUDGET_MS = 2000;
const HUGE_HISTORY = 5000;

// Same length as the real crypto.randomUUID ids, so the size measurement is realistic.
function fakeUuid(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function makeAttempt(index: number): PracticeAttempt {
  const correct = index % 3 !== 0;
  return {
    id: fakeUuid(index),
    questionId: fakeUuid(index + 1_000_000),
    operation: MATH_OPERATIONS[index % MATH_OPERATIONS.length],
    firstOperand: 12,
    secondOperand: 7,
    correctAnswer: 84,
    selectedAnswer: correct ? 84 : 82,
    selfReportedCorrect: correct,
    difficulty: ((index % 4) + 1) as PracticeAttempt["difficulty"],
    source: "regular",
    attemptedAt: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
    sessionId: fakeUuid(Math.floor(index / 10) + 2_000_000),
  };
}

function makeAttempts(count: number): PracticeAttempt[] {
  return Array.from({ length: count }, (_unused, index) => makeAttempt(index));
}

const sessionId = (index: number) => fakeUuid(index + 2_000_000);

function makeSession(index: number): PracticeSession {
  return {
    id: sessionId(index),
    startedAt: new Date(Date.UTC(2026, 0, 1) + index * 3_600_000).toISOString(),
    completedAt: new Date(Date.UTC(2026, 0, 1) + index * 3_600_000 + 600_000).toISOString(),
    operations: ["addition", "multiplication"],
    difficulty: 2,
    sessionLength: 10,
    attempted: 10,
    correct: 8,
    incorrect: 2,
  };
}

function statisticsFor(attempts: PracticeAttempt[]): AppStatistics {
  return attempts.reduce(applyAttemptToStatistics, createEmptyStatistics());
}

// The fastest of a few runs ignores one-off pauses when the whole suite is running in parallel.
function fastestOf(runs: number, prepare: () => void, work: () => void): number {
  let best = Infinity;
  for (let run = 0; run < runs; run++) {
    prepare();
    const start = performance.now();
    work();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

function seedRawAttempts(count: number): PracticeAttempt[] {
  const attempts = makeAttempts(count);
  localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(attempts));
  return attempts;
}

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
});

describe("large attempt histories", () => {
  it("loads several thousand attempts quickly", () => {
    let loaded: PracticeAttempt[] = [];
    const ms = fastestOf(
      3,
      () => seedRawAttempts(HUGE_HISTORY),
      () => (loaded = loadAttempts()),
    );
    expect(loaded).toHaveLength(HUGE_HISTORY);
    expect(ms).toBeLessThan(TIME_BUDGET_MS);
  });

  it("appends to a huge history quickly and keeps only the newest attempts", () => {
    const next = makeAttempt(HUGE_HISTORY);
    let seeded: PracticeAttempt[] = [];
    const ms = fastestOf(
      3,
      () => (seeded = seedRawAttempts(HUGE_HISTORY)),
      () => appendAttempt(next),
    );

    const stored = loadAttempts();
    expect(ms).toBeLessThan(TIME_BUDGET_MS);
    expect(stored).toHaveLength(MAX_STORED_ATTEMPTS);
    expect(stored[stored.length - 1]).toEqual(next);
    expect(stored[0]).toEqual(seeded[HUGE_HISTORY - MAX_STORED_ATTEMPTS + 1]);
  });

  it("does not trim while the history is under the limit", () => {
    seedRawAttempts(MAX_STORED_ATTEMPTS - 1);
    appendAttempt(makeAttempt(MAX_STORED_ATTEMPTS - 1));
    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS);
    expect(loadAttempts()[0].id).toBe(fakeUuid(0));
  });

  it("drops one old attempt for each new one once the limit is reached", () => {
    seedRawAttempts(MAX_STORED_ATTEMPTS);
    appendAttempt(makeAttempt(MAX_STORED_ATTEMPTS));
    appendAttempt(makeAttempt(MAX_STORED_ATTEMPTS + 1));
    const stored = loadAttempts();
    expect(stored).toHaveLength(MAX_STORED_ATTEMPTS);
    expect(stored[0].id).toBe(fakeUuid(2));
    expect(stored[stored.length - 1].id).toBe(fakeUuid(MAX_STORED_ATTEMPTS + 1));
  });

  it("keeps the aggregate statistics when old attempts are trimmed away", () => {
    const attempts = seedRawAttempts(HUGE_HISTORY);
    const totals = statisticsFor(attempts);
    saveStatistics(totals);

    const next = makeAttempt(HUGE_HISTORY);
    appendAttempt(next);
    saveStatistics(applyAttemptToStatistics(loadStatistics(), next));

    const expected = statisticsFor([...attempts, next]);
    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS);
    expect(loadStatistics()).toEqual(expected);
    expect(loadStatistics().attempted).toBe(HUGE_HISTORY + 1);
  });

  it("leaves statistics alone when only the detailed history is trimmed", () => {
    const attempts = seedRawAttempts(HUGE_HISTORY);
    saveStatistics(statisticsFor(attempts));
    const before = localStorage.getItem(STORAGE_KEYS.statistics);

    appendAttempt(makeAttempt(HUGE_HISTORY));

    expect(localStorage.getItem(STORAGE_KEYS.statistics)).toBe(before);
  });
});

describe("recent sessions", () => {
  it("keeps only the newest sessions", () => {
    for (let index = 0; index < MAX_STORED_SESSIONS + 15; index++) saveSession(makeSession(index));

    const stored = loadSessions();
    expect(stored).toHaveLength(MAX_STORED_SESSIONS);
    const ids = new Set(stored.map((session) => session.id));
    expect(ids.has(sessionId(MAX_STORED_SESSIONS + 14))).toBe(true);
    expect(ids.has(sessionId(0))).toBe(false);
    expect(ids.has(sessionId(14))).toBe(false);
    expect(ids.has(sessionId(15))).toBe(true);
  });

  it("updates an existing session instead of adding a copy", () => {
    saveSession(makeSession(1));
    saveSession({ ...makeSession(1), attempted: 11 });
    const stored = loadSessions();
    expect(stored).toHaveLength(1);
    expect(stored[0].attempted).toBe(11);
  });
});

describe("local-storage usage", () => {
  it("counts two bytes per character of every app key and value", () => {
    localStorage.setItem("mathPractice.a", "1234");
    localStorage.setItem("mathPractice.bb", "x");
    localStorage.setItem("somethingElse", "ignored ignored ignored");
    expect(getStorageUsageBytes()).toBe(
      ("mathPractice.a".length + 4 + "mathPractice.bb".length + 1) * 2,
    );
  });

  it("is zero for empty storage", () => {
    expect(getStorageUsageBytes()).toBe(0);
  });

  it("stays well under a typical 5 MB browser limit with a full history", () => {
    localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(makeAttempts(MAX_STORED_ATTEMPTS)));
    for (let index = 0; index < MAX_STORED_SESSIONS; index++) saveSession(makeSession(index));
    saveStatistics(statisticsFor(makeAttempts(MAX_STORED_ATTEMPTS)));

    const bytes = getStorageUsageBytes();
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(2 * 1024 * 1024);
  });
});
