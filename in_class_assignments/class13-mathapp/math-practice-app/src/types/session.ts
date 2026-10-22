import type { DifficultyLevel, MathOperation, QuestionSource } from "./question";

export type SessionLength = number | "continuous";

export type PracticeMode = "regular" | "mistake-review";

export interface SessionConfig {
  operations: MathOperation[];
  difficulty: DifficultyLevel;
  sessionLength: SessionLength;
  mode: PracticeMode;
}

export interface PracticeAttempt {
  id: string;
  questionId: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
  selectedAnswer: number;
  selfReportedCorrect: boolean;
  difficulty: DifficultyLevel;
  source: QuestionSource;
  mistakePatternId?: string;
  attemptedAt: string;
  sessionId: string;
}

export interface PracticeSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  operations: MathOperation[];
  difficulty: DifficultyLevel;
  sessionLength: SessionLength;
  attempted: number;
  correct: number;
  incorrect: number;
}
