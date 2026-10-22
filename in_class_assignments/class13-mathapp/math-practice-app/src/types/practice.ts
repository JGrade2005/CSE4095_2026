import type { DifficultyLevel, MathOperation, Question } from "./question";
import type { PracticeSession, SessionConfig } from "./session";

export type PracticeStatus = "idle" | "active" | "complete";

export type PracticeResult = "correct" | "incorrect";

export interface PracticeState {
  status: PracticeStatus;
  config: SessionConfig | null;
  session: PracticeSession | null;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  selectedAnswer: number | null;
  isCardFlipped: boolean;
  isResultRecorded: boolean;
  lastResult: PracticeResult | null;
  reviewQuestionsCompleted: number;
}

// Ids, timestamps and questions arrive in the payload so the reducer stays pure and testable.
export type PracticeAction =
  | { type: "START_SESSION"; config: SessionConfig; session: PracticeSession; question: Question }
  | { type: "SELECT_ANSWER"; answer: number }
  | { type: "FLIP_CARD" }
  | { type: "RECORD_RESULT"; correct: boolean; recordedAt: string }
  | { type: "NEXT_QUESTION"; question: Question }
  | { type: "END_SESSION"; endedAt: string };

export interface PracticeSessionApi {
  state: PracticeState;
  startSession: (config: SessionConfig) => void;
  selectAnswer: (answer: number) => void;
  flipCard: () => void;
  recordResult: (correct: boolean) => void;
  nextQuestion: () => void;
  endSession: () => void;
  getReviewableCount: (operations: MathOperation[], difficulty: DifficultyLevel) => number;
}
