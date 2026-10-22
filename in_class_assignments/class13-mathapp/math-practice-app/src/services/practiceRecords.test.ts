import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, createEmptyStatistics } from "./defaults";
import { STORAGE_KEYS } from "./storageKeys";
import { getStorageStatus, resetStorageServiceState } from "./storageService";
import {
  MAX_STORED_ATTEMPTS,
  MAX_STORED_SESSIONS,
  appendAttempt,
  initializeStorage,
  loadAttempts,
  loadRecentSessions,
  loadSessions,
  loadSettings,
  loadStatistics,
  saveSession,
  saveSettings,
  saveStatistics,
} from "./practiceRecords";
import type { PracticeAttempt, PracticeSession } from "../types/session";

function makeSession(id: string, startedAt: string): PracticeSession {
  return {
    id,
    startedAt,
    operations: ["addition", "subtraction"],
    difficulty: 2,
    sessionLength: 10,
    attempted: 0,
    correct: 0,
    incorrect: 0,
  };
}

function makeAttempt(id: string): PracticeAttempt {
  return {
    id,
    questionId: `q-${id}`,
    operation: "division",
    firstOperand: 12,
    secondOperand: 3,
    correctAnswer: 4,
    selectedAnswer: 5,
    selfReportedCorrect: false,
    difficulty: 3,
    source: "mistake-review",
    attemptedAt: "2026-03-01T12:00:00.000Z",
    sessionId: "s1",
  };
}

describe("practiceRecords", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageServiceState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("settings", () => {
    it("returns the defaults when nothing is stored", () => {
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it("round trips saved settings", () => {
      const settings = { ...DEFAULT_SETTINGS, soundEffectsEnabled: false, masteryThreshold: 5 };
      expect(saveSettings(settings)).toEqual({ ok: true });
      expect(loadSettings()).toEqual(settings);
    });

    it("recovers from invalid stored settings field by field", () => {
      localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify({ ...DEFAULT_SETTINGS, masteryThreshold: 99, showExplanations: false }),
      );
      expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, showExplanations: false });
    });

    it("recovers from unparseable settings and repairs the key", () => {
      localStorage.setItem(STORAGE_KEYS.settings, "}{");
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? "")).toEqual(
        DEFAULT_SETTINGS,
      );
    });
  });

  describe("sessions", () => {
    it("keeps one record per id and overwrites with completion details", () => {
      saveSession(makeSession("s1", "2026-03-01T10:00:00.000Z"));
      const completed: PracticeSession = {
        ...makeSession("s1", "2026-03-01T10:00:00.000Z"),
        completedAt: "2026-03-01T10:08:00.000Z",
        attempted: 10,
        correct: 7,
        incorrect: 3,
      };
      saveSession(completed);

      const sessions = loadSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual(completed);
      expect(sessions[0].completedAt).toBe("2026-03-01T10:08:00.000Z");
    });

    it("loads recent sessions newest first and limited", () => {
      saveSession(makeSession("old", "2026-03-01T10:00:00.000Z"));
      saveSession(makeSession("new", "2026-03-03T10:00:00.000Z"));
      saveSession(makeSession("mid", "2026-03-02T10:00:00.000Z"));

      expect(loadRecentSessions(10).map((s) => s.id)).toEqual(["new", "mid", "old"]);
      expect(loadRecentSessions(2).map((s) => s.id)).toEqual(["new", "mid"]);
      expect(loadRecentSessions(0)).toEqual([]);
    });

    it("drops the oldest sessions beyond the cap", () => {
      const start = Date.parse("2026-01-01T00:00:00.000Z");
      for (let index = 0; index < MAX_STORED_SESSIONS + 5; index += 1) {
        const startedAt = new Date(start + index * 60_000).toISOString();
        saveSession(makeSession(`s${index}`, startedAt));
      }

      const sessions = loadSessions();
      expect(sessions).toHaveLength(MAX_STORED_SESSIONS);
      expect(sessions.some((s) => s.id === "s0")).toBe(false);
      expect(sessions.some((s) => s.id === "s4")).toBe(false);
      expect(sessions.some((s) => s.id === "s5")).toBe(true);
      expect(sessions.some((s) => s.id === `s${MAX_STORED_SESSIONS + 4}`)).toBe(true);
    });
  });

  describe("attempts", () => {
    it("keeps every field of a saved attempt", () => {
      const attempt = makeAttempt("a1");
      appendAttempt(attempt);
      const [stored] = loadAttempts();

      expect(stored).toEqual(attempt);
      expect(stored).toMatchObject({
        selectedAnswer: 5,
        selfReportedCorrect: false,
        operation: "division",
        difficulty: 3,
        sessionId: "s1",
        attemptedAt: "2026-03-01T12:00:00.000Z",
      });
    });

    it("appends in order", () => {
      appendAttempt(makeAttempt("a1"));
      appendAttempt(makeAttempt("a2"));
      expect(loadAttempts().map((a) => a.id)).toEqual(["a1", "a2"]);
    });

    it("drops the oldest attempts beyond the cap", () => {
      const existing = Array.from({ length: MAX_STORED_ATTEMPTS }, (_, i) => makeAttempt(`a${i}`));
      localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(existing));

      appendAttempt(makeAttempt("newest"));

      const attempts = loadAttempts();
      expect(attempts).toHaveLength(MAX_STORED_ATTEMPTS);
      expect(attempts[0].id).toBe("a1");
      expect(attempts[attempts.length - 1].id).toBe("newest");
    });

    it("leaves aggregate statistics untouched when attempts are trimmed", () => {
      const stats = { ...createEmptyStatistics(), attempted: 5000, correct: 4000, incorrect: 1000 };
      saveStatistics(stats);
      const existing = Array.from({ length: MAX_STORED_ATTEMPTS }, (_, i) => makeAttempt(`a${i}`));
      localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(existing));

      appendAttempt(makeAttempt("newest"));

      expect(loadStatistics()).toEqual(stats);
    });

    it("persists after a browser restart", async () => {
      appendAttempt(makeAttempt("a1"));
      saveSession(makeSession("s1", "2026-03-01T10:00:00.000Z"));
      saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 4 });

      vi.resetModules();
      const restarted = await import("./practiceRecords");

      expect(restarted.loadAttempts()).toEqual([makeAttempt("a1")]);
      expect(restarted.loadSessions()).toHaveLength(1);
      expect(restarted.loadSettings().defaultDifficulty).toBe(4);
    });
  });

  describe("statistics", () => {
    it("returns empty statistics when nothing is stored and round trips saved ones", () => {
      expect(loadStatistics()).toEqual(createEmptyStatistics());
      const stats = { ...createEmptyStatistics(), attempted: 2, correct: 1, incorrect: 1 };
      saveStatistics(stats);
      expect(loadStatistics()).toEqual(stats);
    });

    it("resets invalid stored statistics", () => {
      localStorage.setItem(STORAGE_KEYS.statistics, JSON.stringify({ attempted: -3 }));
      expect(loadStatistics()).toEqual(createEmptyStatistics());
    });
  });

  describe("initializeStorage", () => {
    it("writes the schema version and repairs invalid data at startup", () => {
      localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify([makeAttempt("a1"), { bad: 1 }]));
      localStorage.setItem(STORAGE_KEYS.sessions, "not json");
      localStorage.setItem("otherApp.theme", "dark");

      initializeStorage();

      expect(localStorage.getItem(STORAGE_KEYS.version)).toBe('{"version":1}');
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts) ?? "")).toEqual([
        makeAttempt("a1"),
      ]);
      expect(localStorage.getItem(STORAGE_KEYS.sessions)).toBe("[]");
      expect(localStorage.getItem("otherApp.theme")).toBe("dark");
    });

    it("does not throw and reports unavailable when storage is blocked", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });

      expect(() => initializeStorage()).not.toThrow();
      expect(getStorageStatus().available).toBe(false);
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it("keeps working in memory after a full disk", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });

      expect(appendAttempt(makeAttempt("a1"))).toEqual({ ok: false, error: "quota" });
      expect(loadAttempts()).toEqual([makeAttempt("a1")]);
      expect(getStorageStatus().quotaExceeded).toBe(true);
    });
  });
});
