import { DIFFICULTY_LEVELS, MATH_OPERATIONS } from "../types/question";
import type { DifficultyLevel, MathOperation, QuestionSource } from "../types/question";
import type { MistakePattern } from "../types/mistake";
import type { PracticeState } from "../types/practice";
import type { Question } from "../types/question";
import type {
  PracticeAttempt,
  PracticeSession,
  SessionConfig,
  SessionLength,
} from "../types/session";
import type { AppSettings } from "../types/settings";
import type { AppStatistics, OperationStatistics } from "../types/statistics";
import { validateQuestion } from "../utils/validation";
import { createDefaultSettings, createEmptyStatistics } from "./defaults";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isMathOperation(value: unknown): value is MathOperation {
  return MATH_OPERATIONS.some((operation) => operation === value);
}

function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return DIFFICULTY_LEVELS.some((level) => level === value);
}

function isQuestionSource(value: unknown): value is QuestionSource {
  return value === "regular" || value === "mistake-review";
}

function isSessionLength(value: unknown): value is SessionLength {
  return value === "continuous" || (isNonNegativeInteger(value) && value >= 1);
}

function isOperationList(value: unknown): value is MathOperation[] {
  return Array.isArray(value) && value.length > 0 && value.every(isMathOperation);
}

function isOperationStatistics(value: unknown): value is OperationStatistics {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.attempted) &&
    isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.incorrect)
  );
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickValidOperations(value: unknown, fallback: MathOperation[]): MathOperation[] {
  if (!Array.isArray(value)) return fallback;
  const known = value.filter(isMathOperation);
  const unique = MATH_OPERATIONS.filter((operation) => known.includes(operation));
  return unique.length > 0 ? unique : fallback;
}

function pickMasteryThreshold(value: unknown, fallback: number): number {
  const valid = typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10;
  return valid ? value : fallback;
}

export function validateSettings(raw: unknown): AppSettings {
  const defaults = createDefaultSettings();
  if (!isRecord(raw)) return defaults;
  return {
    soundEffectsEnabled: pickBoolean(raw.soundEffectsEnabled, defaults.soundEffectsEnabled),
    cardAnimationEnabled: pickBoolean(raw.cardAnimationEnabled, defaults.cardAnimationEnabled),
    showExplanations: pickBoolean(raw.showExplanations, defaults.showExplanations),
    defaultSessionLength: isSessionLength(raw.defaultSessionLength)
      ? raw.defaultSessionLength
      : defaults.defaultSessionLength,
    defaultDifficulty: isDifficultyLevel(raw.defaultDifficulty)
      ? raw.defaultDifficulty
      : defaults.defaultDifficulty,
    defaultOperations: pickValidOperations(raw.defaultOperations, defaults.defaultOperations),
    masteryThreshold: pickMasteryThreshold(raw.masteryThreshold, defaults.masteryThreshold),
    allowNegativeSubtraction: pickBoolean(
      raw.allowNegativeSubtraction,
      defaults.allowNegativeSubtraction,
    ),
    feedbackMessagesEnabled: pickBoolean(
      raw.feedbackMessagesEnabled,
      defaults.feedbackMessagesEnabled,
    ),
  };
}

function isPracticeAttempt(value: unknown): value is PracticeAttempt {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.questionId) &&
    isMathOperation(value.operation) &&
    isFiniteNumber(value.firstOperand) &&
    isFiniteNumber(value.secondOperand) &&
    isFiniteNumber(value.correctAnswer) &&
    isFiniteNumber(value.selectedAnswer) &&
    typeof value.selfReportedCorrect === "boolean" &&
    isDifficultyLevel(value.difficulty) &&
    isQuestionSource(value.source) &&
    (value.mistakePatternId === undefined || isNonEmptyString(value.mistakePatternId)) &&
    isDateString(value.attemptedAt) &&
    isNonEmptyString(value.sessionId)
  );
}

function isPracticeSession(value: unknown): value is PracticeSession {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isDateString(value.startedAt) &&
    (value.completedAt === undefined || isDateString(value.completedAt)) &&
    isOperationList(value.operations) &&
    isDifficultyLevel(value.difficulty) &&
    isSessionLength(value.sessionLength) &&
    isNonNegativeInteger(value.attempted) &&
    isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.incorrect)
  );
}

function isMistakePattern(value: unknown): value is MistakePattern {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isMathOperation(value.operation) &&
    isFiniteNumber(value.firstOperand) &&
    isFiniteNumber(value.secondOperand) &&
    isFiniteNumber(value.correctAnswer) &&
    isDifficultyLevel(value.difficulty) &&
    isNonNegativeInteger(value.incorrectCount) &&
    isNonNegativeInteger(value.similarCorrectCount) &&
    isDateString(value.lastIncorrectAt) &&
    typeof value.mastered === "boolean"
  );
}

function keepValidEntries<T>(raw: unknown, isValid: (entry: unknown) => entry is T): T[] {
  return Array.isArray(raw) ? raw.filter(isValid) : [];
}

export function validateAttempts(raw: unknown): PracticeAttempt[] {
  return keepValidEntries(raw, isPracticeAttempt);
}

export function validateSessions(raw: unknown): PracticeSession[] {
  return keepValidEntries(raw, isPracticeSession);
}

export function validateMistakePatterns(raw: unknown): MistakePattern[] {
  return keepValidEntries(raw, isMistakePattern);
}

function hasValidBreakdown(value: unknown, keys: readonly (string | number)[]): boolean {
  return isRecord(value) && keys.every((key) => isOperationStatistics(value[key]));
}

function isAppStatistics(value: unknown): value is AppStatistics {
  return (
    isOperationStatistics(value) &&
    isRecord(value) &&
    hasValidBreakdown(value.byOperation, MATH_OPERATIONS) &&
    hasValidBreakdown(value.byDifficulty, DIFFICULTY_LEVELS)
  );
}

export function validateStatistics(raw: unknown): AppStatistics {
  return isAppStatistics(raw) ? raw : createEmptyStatistics();
}

export interface VersionRecord {
  version: number;
}

// A missing or unreadable version counts as 0 so the migrations run from the start.
export function validateVersionRecord(raw: unknown): VersionRecord {
  return { version: isRecord(raw) && isNonNegativeInteger(raw.version) ? raw.version : 0 };
}

function isSessionConfig(value: unknown): value is SessionConfig {
  return (
    isRecord(value) &&
    isOperationList(value.operations) &&
    isDifficultyLevel(value.difficulty) &&
    isSessionLength(value.sessionLength) &&
    (value.mode === "regular" || value.mode === "mistake-review")
  );
}

function hasQuestionShape(value: unknown): value is Question {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isMathOperation(value.operation) &&
    isFiniteNumber(value.firstOperand) &&
    isFiniteNumber(value.secondOperand) &&
    typeof value.displayText === "string" &&
    isFiniteNumber(value.correctAnswer) &&
    Array.isArray(value.choices) &&
    value.choices.every(isFiniteNumber) &&
    isDifficultyLevel(value.difficulty) &&
    isQuestionSource(value.source) &&
    (value.mistakePatternId === undefined || isNonEmptyString(value.mistakePatternId))
  );
}

function isRestorableQuestion(value: unknown): value is Question {
  // The negative-subtraction setting may have changed since the question was made.
  return (
    hasQuestionShape(value) && validateQuestion(value, { allowNegativeSubtraction: true }).valid
  );
}

function isActiveState(value: unknown): value is PracticeState {
  if (!isRecord(value) || value.status !== "active") return false;
  if (!isSessionConfig(value.config) || !isPracticeSession(value.session)) return false;
  if (value.session.completedAt !== undefined || !isRestorableQuestion(value.currentQuestion)) {
    return false;
  }
  const { selectedAnswer, isCardFlipped, isResultRecorded, currentQuestionIndex } = value;
  const answerIsValid =
    selectedAnswer === null ||
    (isFiniteNumber(selectedAnswer) && value.currentQuestion.choices.includes(selectedAnswer));
  if (!answerIsValid || typeof isCardFlipped !== "boolean") return false;
  if (typeof isResultRecorded !== "boolean" || !isNonNegativeInteger(currentQuestionIndex)) {
    return false;
  }
  if (!isNonNegativeInteger(value.reviewQuestionsCompleted)) return false;
  if (
    value.lastResult !== null &&
    value.lastResult !== "correct" &&
    value.lastResult !== "incorrect"
  ) {
    return false;
  }
  if ((isCardFlipped || isResultRecorded) && selectedAnswer === null) return false;
  if (isResultRecorded && (!isCardFlipped || value.lastResult === null)) return false;
  return value.session.attempted === currentQuestionIndex + (isResultRecorded ? 1 : 0);
}

// Anything that is not a fully consistent in-progress session is dropped rather than repaired.
export function validateActiveSession(raw: unknown): PracticeState | null {
  return isActiveState(raw) ? raw : null;
}
