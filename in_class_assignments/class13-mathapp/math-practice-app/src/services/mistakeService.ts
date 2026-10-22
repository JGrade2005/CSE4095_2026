import { createId } from "../utils/ids";
import type { MistakePattern } from "../types/mistake";
import type { DifficultyLevel, MathOperation } from "../types/question";

export interface IncorrectAnswerInfo {
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
  difficulty: DifficultyLevel;
}

function isCommutative(operation: MathOperation): boolean {
  return operation === "addition" || operation === "multiplication";
}

function normalizeOperands(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
): [number, number] {
  if (isCommutative(operation) && firstOperand > secondOperand) {
    return [secondOperand, firstOperand];
  }
  return [firstOperand, secondOperand];
}

export function getPatternKey(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
): string {
  const [first, second] = normalizeOperands(operation, firstOperand, secondOperand);
  return `${operation}:${first}:${second}`;
}

export function findPattern(
  patterns: MistakePattern[],
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
): MistakePattern | undefined {
  const key = getPatternKey(operation, firstOperand, secondOperand);
  return patterns.find(
    (pattern) =>
      getPatternKey(pattern.operation, pattern.firstOperand, pattern.secondOperand) === key,
  );
}

function createPattern(info: IncorrectAnswerInfo, now: Date): MistakePattern {
  const [firstOperand, secondOperand] = normalizeOperands(
    info.operation,
    info.firstOperand,
    info.secondOperand,
  );
  return {
    id: createId(),
    operation: info.operation,
    firstOperand,
    secondOperand,
    correctAnswer: info.correctAnswer,
    difficulty: info.difficulty,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: now.toISOString(),
    mastered: false,
  };
}

// A new miss restarts mastery progress so the fact returns to the active review list.
function applyMiss(pattern: MistakePattern, info: IncorrectAnswerInfo, now: Date): MistakePattern {
  return {
    ...pattern,
    difficulty: info.difficulty,
    incorrectCount: pattern.incorrectCount + 1,
    similarCorrectCount: 0,
    lastIncorrectAt: now.toISOString(),
    mastered: false,
  };
}

export function recordIncorrectAnswer(
  patterns: MistakePattern[],
  info: IncorrectAnswerInfo,
  now: Date = new Date(),
): MistakePattern[] {
  const existing = findPattern(patterns, info.operation, info.firstOperand, info.secondOperand);
  if (!existing) return [...patterns, createPattern(info, now)];
  return patterns.map((pattern) =>
    pattern === existing ? applyMiss(pattern, info, now) : pattern,
  );
}
