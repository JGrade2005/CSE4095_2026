import { act, fireEvent, screen, within } from "@testing-library/react";
import { createDefaultSettings } from "../services/defaults";
import { saveMistakePatterns, saveSettings } from "../services/practiceRecords";
import { resetStorageServiceState } from "../services/storageService";
import type { MistakePattern } from "../types/mistake";
import type { AppSettings } from "../types/settings";
import { NEXT_QUESTION_FAST_DELAY_MS } from "../pages/PracticePage";

export function resetAppStorage(settings: Partial<AppSettings> = {}) {
  localStorage.clear();
  resetStorageServiceState();
  saveSettings({
    ...createDefaultSettings(),
    cardAnimationEnabled: false,
    soundEffectsEnabled: false,
    defaultSessionLength: 5,
    ...settings,
  });
}

export function seedAdditionMistake(overrides: Partial<MistakePattern> = {}) {
  saveMistakePatterns([
    {
      id: "seeded-pattern",
      operation: "addition",
      firstOperand: 3,
      secondOperand: 4,
      correctAnswer: 7,
      difficulty: 1,
      incorrectCount: 2,
      similarCorrectCount: 0,
      lastIncorrectAt: "2026-03-01T12:00:00.000Z",
      mastered: false,
      ...overrides,
    },
  ]);
}

// Testing Library only drains its async wrapper under fake timers when it sees a global `jest`,
// so a tiny shim keeps awaited user-event calls from hanging while vitest's timers are faked.
export function useFakeTimers() {
  vi.useFakeTimers();
  (globalThis as { jest?: unknown }).jest = { advanceTimersByTime: vi.advanceTimersByTime };
}

export function useRealTimers() {
  vi.useRealTimers();
  delete (globalThis as { jest?: unknown }).jest;
}

// Tests using these helpers run with fake timers and userEvent.setup({ delay: null }).
export function advanceToNextQuestion() {
  act(() => {
    vi.advanceTimersByTime(NEXT_QUESTION_FAST_DELAY_MS);
  });
}

// These use fireEvent instead of userEvent: a five-question session is dozens of clicks.
export function pickFirstChoiceAndFlip() {
  const group = screen.getByRole("group", { name: "Answer choices" });
  fireEvent.click(within(group).getAllByRole("button")[0]);
  fireEvent.click(screen.getByRole("button", { name: "Flip Card" }));
}

export function recordResult(correct: boolean) {
  fireEvent.click(
    screen.getByRole("button", { name: correct ? "I Got It Right" : "I Got It Wrong" }),
  );
}

export function answerQuestion(correct: boolean) {
  pickFirstChoiceAndFlip();
  recordResult(correct);
}

// Answers a question and waits out the transition so the next card (or the summary) is showing.
export function answerAndAdvance(correct: boolean) {
  answerQuestion(correct);
  advanceToNextQuestion();
}

export function startFromSetup() {
  fireEvent.click(screen.getByRole("button", { name: "Start Session" }));
}
