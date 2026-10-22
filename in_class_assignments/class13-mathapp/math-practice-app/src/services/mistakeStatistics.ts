import { MATH_OPERATIONS } from "../types/question";
import type { MathOperation } from "../types/question";
import type { MistakePattern } from "../types/mistake";
import type { PracticeAttempt } from "../types/session";
import { OPERATION_SYMBOLS } from "../utils/math";

export function countActivePatterns(patterns: MistakePattern[]): number {
  return patterns.filter((pattern) => !pattern.mastered).length;
}

export function countMasteredPatterns(patterns: MistakePattern[]): number {
  return patterns.filter((pattern) => pattern.mastered).length;
}

// Every operation tied for the highest total is returned, in MATH_OPERATIONS order.
export function getMostMissedOperations(patterns: MistakePattern[]): MathOperation[] {
  const totals = MATH_OPERATIONS.map((operation) => ({
    operation,
    missed: patterns
      .filter((pattern) => pattern.operation === operation)
      .reduce((sum, pattern) => sum + pattern.incorrectCount, 0),
  }));
  const highest = Math.max(...totals.map((total) => total.missed));
  if (highest <= 0) return [];
  return totals.filter((total) => total.missed === highest).map((total) => total.operation);
}

export function getTopMissedFacts(patterns: MistakePattern[], limit = 5): MistakePattern[] {
  return [...patterns]
    .sort(
      (a, b) =>
        b.incorrectCount - a.incorrectCount ||
        Date.parse(b.lastIncorrectAt) - Date.parse(a.lastIncorrectAt),
    )
    .slice(0, Math.max(0, limit));
}

export function countSimilarPracticed(attempts: PracticeAttempt[]): number {
  return attempts.filter((attempt) => attempt.source === "mistake-review").length;
}

export function countSimilarCorrect(attempts: PracticeAttempt[]): number {
  return attempts.filter(
    (attempt) => attempt.source === "mistake-review" && attempt.selfReportedCorrect,
  ).length;
}

export function formatFact(pattern: MistakePattern): string {
  const symbol = OPERATION_SYMBOLS[pattern.operation];
  return `${pattern.firstOperand} ${symbol} ${pattern.secondOperand} = ${pattern.correctAnswer}`;
}
