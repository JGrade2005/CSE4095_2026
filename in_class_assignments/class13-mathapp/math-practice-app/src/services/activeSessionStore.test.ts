import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeActiveState } from "../test/activeSessionFixtures";
import type { PracticeState } from "../types/practice";
import { clearActiveSession, loadActiveSession, saveActiveSession } from "./activeSessionStore";
import { STORAGE_KEYS } from "./storageKeys";
import { resetStorageServiceState } from "./storageService";

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("activeSessionStore", () => {
  it("returns null when nothing was saved", () => {
    expect(loadActiveSession()).toBeNull();
  });

  it("restores the session, current question and config", () => {
    const state = makeActiveState({ currentQuestionIndex: 0 });
    saveActiveSession(state);
    expect(loadActiveSession()).toEqual(state);
  });

  it("restores the selected answer and the flipped card", () => {
    const base = makeActiveState();
    const state = {
      ...base,
      selectedAnswer: base.currentQuestion!.choices[2],
      isCardFlipped: true,
    };
    saveActiveSession(state);
    expect(loadActiveSession()).toEqual(state);
  });

  it("restores a question whose result was already recorded", () => {
    const base = makeActiveState();
    const state = {
      ...base,
      selectedAnswer: base.currentQuestion!.correctAnswer,
      isCardFlipped: true,
      isResultRecorded: true,
      lastResult: "correct" as const,
      session: { ...base.session!, attempted: 1, correct: 1 },
    };
    saveActiveSession(state);
    expect(loadActiveSession()).toEqual(state);
  });

  it("clears the saved session", () => {
    saveActiveSession(makeActiveState());
    clearActiveSession();
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    expect(loadActiveSession()).toBeNull();
  });

  it("does not touch other stored categories", () => {
    localStorage.setItem(STORAGE_KEYS.settings, "{}");
    saveActiveSession(makeActiveState());
    clearActiveSession();
    expect(localStorage.getItem(STORAGE_KEYS.settings)).toBe("{}");
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(loadActiveSession()).toBeNull();
  });

  describe("rejects data that is not a trustworthy in-progress session", () => {
    const rejected: [string, (state: PracticeState) => unknown][] = [
      ["a finished session", (state) => ({ ...state, status: "complete" })],
      ["an idle state", (state) => ({ ...state, status: "idle" })],
      ["a missing question", (state) => ({ ...state, currentQuestion: null })],
      [
        "a question with duplicate choices",
        (state) => ({
          ...state,
          currentQuestion: { ...state.currentQuestion, choices: [7, 7, 8, 9] },
        }),
      ],
      [
        "a question with the wrong answer",
        (state) => ({ ...state, currentQuestion: { ...state.currentQuestion, correctAnswer: 99 } }),
      ],
      ["a selected answer that is not a choice", (state) => ({ ...state, selectedAnswer: 12345 })],
      ["a flipped card with no selection", (state) => ({ ...state, isCardFlipped: true })],
      [
        "a recorded result without a flip",
        (state) => ({ ...state, isResultRecorded: true, lastResult: "correct" }),
      ],
      [
        "an attempt count that does not match the question number",
        (state) => ({ ...state, currentQuestionIndex: 3 }),
      ],
      ["an invalid config", (state) => ({ ...state, config: { ...state.config, difficulty: 9 } })],
      ["a missing session", (state) => ({ ...state, session: null })],
      [
        "a session that already has a completion time",
        (state) => ({
          ...state,
          session: { ...state.session, completedAt: "2026-03-01T12:30:00Z" },
        }),
      ],
      ["a non-boolean flag", (state) => ({ ...state, isCardFlipped: "yes" })],
      ["a bad last result", (state) => ({ ...state, lastResult: "maybe" })],
    ];

    it.each(rejected)("%s", (_name, corrupt) => {
      localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(corrupt(makeActiveState())));
      expect(loadActiveSession()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    });

    it.each(["not json", "[]", "42", '"text"'])("raw value %s", (raw) => {
      localStorage.setItem(STORAGE_KEYS.activeSession, raw);
      expect(loadActiveSession()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    });
  });
});
