import { MATH_OPERATIONS, DIFFICULTY_LEVELS } from "../types/question";
import type { Question } from "../types/question";
import { isWithinLevel } from "../services/difficultyRules";
import type { LevelOptions } from "../services/difficultyRules";
import { calculateAnswer } from "./math";

export type ValidationResult = { valid: true } | { valid: false; reason: string };

const REQUIRED_CHOICE_COUNT = 4;

const VALID: ValidationResult = { valid: true };

function invalid(reason: string): ValidationResult {
  return { valid: false, reason };
}

function checkOperands(question: Question): ValidationResult {
  const { operation, firstOperand, secondOperand } = question;
  if (!Number.isInteger(firstOperand) || !Number.isInteger(secondOperand)) {
    return invalid("Operands must be whole numbers.");
  }
  if (operation === "division") {
    if (secondOperand === 0) {
      return invalid("Division by zero is not allowed.");
    }
    if (firstOperand % secondOperand !== 0) {
      return invalid("Division must give a whole-number answer.");
    }
  }
  return VALID;
}

function checkAnswer(question: Question): ValidationResult {
  const { operation, firstOperand, secondOperand, correctAnswer } = question;
  if (!Number.isInteger(correctAnswer)) {
    return invalid("The correct answer must be a finite whole number.");
  }
  if (correctAnswer !== calculateAnswer(operation, firstOperand, secondOperand)) {
    return invalid("The correct answer does not match the operands.");
  }
  return VALID;
}

function checkChoices(question: Question): ValidationResult {
  const { choices, correctAnswer } = question;
  if (choices.length !== REQUIRED_CHOICE_COUNT) {
    return invalid(`There must be exactly ${REQUIRED_CHOICE_COUNT} answer choices.`);
  }
  if (choices.some((choice) => !Number.isInteger(choice))) {
    return invalid("Every answer choice must be a whole number.");
  }
  if (new Set(choices).size !== choices.length) {
    return invalid("Answer choices must be unique.");
  }
  if (choices.filter((choice) => choice === correctAnswer).length !== 1) {
    return invalid("Exactly one answer choice must equal the correct answer.");
  }
  return VALID;
}

export function validateQuestion(question: Question, options: LevelOptions = {}): ValidationResult {
  if (!MATH_OPERATIONS.includes(question.operation)) {
    return invalid(`Unsupported operation: ${String(question.operation)}.`);
  }
  if (!DIFFICULTY_LEVELS.includes(question.difficulty)) {
    return invalid(`Unsupported difficulty level: ${String(question.difficulty)}.`);
  }
  const checks = [checkOperands, checkAnswer, checkChoices];
  for (const check of checks) {
    const result = check(question);
    if (!result.valid) {
      return result;
    }
  }
  if (!isWithinLevel(question, options)) {
    return invalid("The question is outside the selected difficulty level.");
  }
  return VALID;
}
