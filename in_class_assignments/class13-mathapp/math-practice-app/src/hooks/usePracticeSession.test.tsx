import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import PracticeSessionProvider from "../app/PracticeSessionProvider";
import SettingsProvider from "../app/SettingsProvider";
import {
  loadAttempts,
  loadMistakePatterns,
  loadSessions,
  loadStatistics,
  saveMistakePatterns,
  saveSettings,
} from "../services/practiceRecords";
import { createDefaultSettings } from "../services/defaults";
import { STORAGE_KEYS } from "../services/storageKeys";
import { resetStorageServiceState } from "../services/storageService";
import type { MistakePattern } from "../types/mistake";
import type { SessionConfig } from "../types/session";
import { usePracticeSession } from "./usePracticeSession";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <PracticeSessionProvider>{children}</PracticeSessionProvider>
    </SettingsProvider>
  );
}

const regularConfig: SessionConfig = {
  operations: ["addition"],
  difficulty: 1,
  sessionLength: 5,
  mode: "regular",
};

const reviewConfig: SessionConfig = {
  operations: ["multiplication"],
  difficulty: 2,
  sessionLength: 10,
  mode: "mistake-review",
};

function storedPattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: "stored-pattern",
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

function setup() {
  return renderHook(() => usePracticeSession(), { wrapper });
}

type Hook = ReturnType<typeof setup>;

function answerCurrent(hook: Hook, correct: boolean, answer?: number) {
  const question = hook.result.current.state.currentQuestion;
  if (!question) throw new Error("no question");
  act(() => hook.result.current.selectAnswer(answer ?? question.choices[0]));
  act(() => hook.result.current.flipCard());
  act(() => hook.result.current.recordResult(correct));
}

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
});

describe("usePracticeSession", () => {
  it("throws outside the provider", () => {
    expect(() => renderHook(() => usePracticeSession())).toThrow(/PracticeSessionProvider/);
  });

  it("starts idle", () => {
    const hook = setup();
    expect(hook.result.current.state.status).toBe("idle");
  });

  it("startSession activates the session and saves it", () => {
    const hook = setup();
    act(() => hook.result.current.startSession(regularConfig));

    const { state } = hook.result.current;
    expect(state.status).toBe("active");
    expect(state.currentQuestion?.operation).toBe("addition");
    expect(state.currentQuestion?.source).toBe("regular");

    const sessions = loadSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: state.session?.id,
      operations: ["addition"],
      difficulty: 1,
      sessionLength: 5,
      attempted: 0,
    });
    expect(sessions[0].completedAt).toBeUndefined();
  });

  it("records a wrong answer with every attempt field, statistics and a mistake pattern", () => {
    const hook = setup();
    act(() => hook.result.current.startSession(regularConfig));
    const question = hook.result.current.state.currentQuestion!;
    const wrongChoice = question.choices.find((choice) => choice !== question.correctAnswer)!;
    answerCurrent(hook, false, wrongChoice);

    const attempts = loadAttempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toEqual({
      id: expect.any(String),
      questionId: question.id,
      operation: question.operation,
      firstOperand: question.firstOperand,
      secondOperand: question.secondOperand,
      correctAnswer: question.correctAnswer,
      selectedAnswer: wrongChoice,
      selfReportedCorrect: false,
      difficulty: 1,
      source: "regular",
      attemptedAt: expect.any(String),
      sessionId: hook.result.current.state.session?.id,
    });

    expect(loadStatistics()).toMatchObject({ attempted: 1, correct: 0, incorrect: 1 });
    expect(localStorage.getItem(STORAGE_KEYS.statistics)).not.toBeNull();

    const patterns = loadMistakePatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      operation: question.operation,
      incorrectCount: 1,
      similarCorrectCount: 0,
      mastered: false,
    });

    expect(hook.result.current.state.session).toMatchObject({ attempted: 1, incorrect: 1 });
    expect(loadSessions()[0]).toMatchObject({ attempted: 1, incorrect: 1, correct: 0 });
  });

  it("a right answer stores no mistake pattern", () => {
    const hook = setup();
    act(() => hook.result.current.startSession(regularConfig));
    answerCurrent(hook, true);
    expect(loadMistakePatterns()).toHaveLength(0);
    expect(loadStatistics()).toMatchObject({ attempted: 1, correct: 1 });
  });

  it("ignores a second recordResult call, even in the same tick", () => {
    const hook = setup();
    act(() => hook.result.current.startSession(regularConfig));
    const question = hook.result.current.state.currentQuestion!;
    act(() => {
      hook.result.current.selectAnswer(question.choices[0]);
      hook.result.current.flipCard();
      hook.result.current.recordResult(false);
      hook.result.current.recordResult(false);
    });
    act(() => hook.result.current.recordResult(false));

    expect(loadAttempts()).toHaveLength(1);
    expect(loadStatistics().attempted).toBe(1);
    expect(loadMistakePatterns()[0].incorrectCount).toBe(1);
    expect(hook.result.current.state.session?.attempted).toBe(1);
  });

  it("stores nothing when the card was not flipped", () => {
    const hook = setup();
    act(() => hook.result.current.startSession(regularConfig));
    act(() =>
      hook.result.current.selectAnswer(hook.result.current.state.currentQuestion!.choices[0]),
    );
    act(() => hook.result.current.recordResult(true));
    expect(loadAttempts()).toHaveLength(0);
  });

  it("completes a fixed 2-question session and saves completedAt", () => {
    const hook = setup();
    act(() => hook.result.current.startSession({ ...regularConfig, sessionLength: 2 }));
    answerCurrent(hook, true);
    expect(hook.result.current.state.status).toBe("active");
    act(() => hook.result.current.nextQuestion());
    expect(hook.result.current.state.currentQuestionIndex).toBe(1);
    answerCurrent(hook, false);

    expect(hook.result.current.state.status).toBe("complete");
    const saved = loadSessions()[0];
    expect(saved.completedAt).toBeDefined();
    expect(saved).toMatchObject({ attempted: 2, correct: 1, incorrect: 1 });

    act(() => hook.result.current.nextQuestion());
    expect(hook.result.current.state.currentQuestionIndex).toBe(1);
  });

  it("nextQuestion does nothing before a result is recorded", () => {
    const hook = setup();
    act(() => hook.result.current.startSession(regularConfig));
    const first = hook.result.current.state.currentQuestion;
    act(() => hook.result.current.nextQuestion());
    expect(hook.result.current.state.currentQuestion).toBe(first);
    expect(hook.result.current.state.currentQuestionIndex).toBe(0);
  });

  it("endSession completes a continuous session and saves it, without storing a flipped card", () => {
    const hook = setup();
    act(() => hook.result.current.startSession({ ...regularConfig, sessionLength: "continuous" }));
    answerCurrent(hook, true);
    act(() => hook.result.current.nextQuestion());
    const question = hook.result.current.state.currentQuestion!;
    act(() => hook.result.current.selectAnswer(question.choices[0]));
    act(() => hook.result.current.flipCard());
    act(() => hook.result.current.endSession());

    expect(hook.result.current.state.status).toBe("complete");
    expect(loadSessions()[0]).toMatchObject({ attempted: 1, correct: 1 });
    expect(loadSessions()[0].completedAt).toBeDefined();
    expect(loadAttempts()).toHaveLength(1);
  });

  it("never repeats the previous question", () => {
    const hook = setup();
    act(() => hook.result.current.startSession({ ...regularConfig, sessionLength: "continuous" }));
    for (let index = 0; index < 150; index++) {
      const previous = hook.result.current.state.currentQuestion!;
      answerCurrent(hook, true);
      act(() => hook.result.current.nextQuestion());
      const next = hook.result.current.state.currentQuestion!;
      const repeated =
        next.operation === previous.operation &&
        next.firstOperand === previous.firstOperand &&
        next.secondOperand === previous.secondOperand;
      expect(repeated).toBe(false);
    }
  });

  it("keeps working with sound effects enabled (no AudioContext in jsdom)", () => {
    saveSettings({ ...createDefaultSettings(), soundEffectsEnabled: true });
    const hook = setup();
    act(() => hook.result.current.startSession(regularConfig));
    expect(() => answerCurrent(hook, true)).not.toThrow();
  });

  describe("mistake review", () => {
    it("produces mistake-review questions from stored patterns", () => {
      saveMistakePatterns([storedPattern()]);
      const hook = setup();
      act(() => hook.result.current.startSession(reviewConfig));

      const question = hook.result.current.state.currentQuestion!;
      expect(question.source).toBe("mistake-review");
      expect(question.mistakePatternId).toBe("stored-pattern");
    });

    it("falls back to regular questions when nothing is reviewable", () => {
      saveMistakePatterns([storedPattern({ mastered: true })]);
      const hook = setup();
      act(() => hook.result.current.startSession(reviewConfig));
      expect(hook.result.current.state.currentQuestion?.source).toBe("regular");
    });

    it("counts correct review answers and masters the pattern on the third", () => {
      saveMistakePatterns([storedPattern()]);
      const hook = setup();
      act(() => hook.result.current.startSession(reviewConfig));

      answerCurrent(hook, true);
      expect(loadMistakePatterns()[0]).toMatchObject({ similarCorrectCount: 1, mastered: false });
      expect(hook.result.current.state.reviewQuestionsCompleted).toBe(1);

      act(() => hook.result.current.nextQuestion());
      answerCurrent(hook, true);
      expect(loadMistakePatterns()[0]).toMatchObject({ similarCorrectCount: 2, mastered: false });

      act(() => hook.result.current.nextQuestion());
      answerCurrent(hook, true);
      expect(loadMistakePatterns()[0]).toMatchObject({ similarCorrectCount: 3, mastered: true });
      expect(hook.result.current.getReviewableCount(["multiplication"], 2)).toBe(0);
      expect(loadAttempts().every((attempt) => attempt.source === "mistake-review")).toBe(true);
    });

    it("resets progress when a review answer is wrong", () => {
      saveMistakePatterns([storedPattern({ similarCorrectCount: 2 })]);
      const hook = setup();
      act(() => hook.result.current.startSession(reviewConfig));
      answerCurrent(hook, false);

      const source = loadMistakePatterns().find((pattern) => pattern.id === "stored-pattern");
      expect(source).toMatchObject({ similarCorrectCount: 0, mastered: false });
    });

    it("respects the mastery threshold setting", () => {
      saveSettings({ ...createDefaultSettings(), masteryThreshold: 2 });
      saveMistakePatterns([storedPattern()]);
      const hook = setup();
      act(() => hook.result.current.startSession(reviewConfig));
      answerCurrent(hook, true);
      act(() => hook.result.current.nextQuestion());
      answerCurrent(hook, true);
      expect(loadMistakePatterns()[0]).toMatchObject({ similarCorrectCount: 2, mastered: true });
    });
  });

  it("getReviewableCount counts active patterns for the operations and level", () => {
    saveMistakePatterns([
      storedPattern({ id: "a" }),
      storedPattern({ id: "b", mastered: true }),
      storedPattern({ id: "c", difficulty: 3 }),
    ]);
    const hook = setup();
    expect(hook.result.current.getReviewableCount(["multiplication"], 2)).toBe(1);
    expect(hook.result.current.getReviewableCount(["addition"], 2)).toBe(0);
  });
});
