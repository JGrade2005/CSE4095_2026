import type { DifficultyLevel, MathOperation } from "../types/question";
import type { SessionLength } from "../types/session";

export const OPERATION_LABELS: Record<MathOperation, string> = {
  addition: "Addition",
  subtraction: "Subtraction",
  multiplication: "Multiplication",
  division: "Division",
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Intermediate",
  4: "Advanced",
};

export const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
  1: "Small numbers up to 10. Times tables up to 5.",
  2: "Numbers up to 50. Times tables up to 10.",
  3: "Numbers up to 100, with carrying and borrowing.",
  4: "Big numbers up to 1,000 and two-digit times tables.",
};

export const SESSION_LENGTH_OPTIONS: readonly SessionLength[] = [5, 10, 20, "continuous"];

export function formatDifficulty(level: DifficultyLevel): string {
  return `Level ${level}: ${DIFFICULTY_LABELS[level]}`;
}

export function formatSessionLength(length: SessionLength): string {
  return length === "continuous" ? "Continuous practice" : `${length} questions`;
}
