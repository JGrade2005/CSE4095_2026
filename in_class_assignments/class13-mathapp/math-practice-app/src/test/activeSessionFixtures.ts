import { initialPracticeState } from "../services/practiceReducer";
import { buildQuestion } from "../services/questionGenerator";
import type { PracticeState } from "../types/practice";

export function makeActiveState(overrides: Partial<PracticeState> = {}): PracticeState {
  const question = buildQuestion("addition", 3, 4, 1);
  return {
    ...initialPracticeState,
    status: "active",
    config: { operations: ["addition"], difficulty: 1, sessionLength: 5, mode: "regular" },
    session: {
      id: "session-1",
      startedAt: "2026-03-01T12:00:00.000Z",
      operations: ["addition"],
      difficulty: 1,
      sessionLength: 5,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    },
    currentQuestion: question,
    ...overrides,
  };
}
