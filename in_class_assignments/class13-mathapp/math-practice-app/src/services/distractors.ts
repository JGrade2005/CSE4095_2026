import type { MathOperation } from "../types/question";
import { pickRandom, randomInt } from "../utils/math";
import { shuffle } from "../utils/shuffle";

export interface ChoiceParts {
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
}

export interface ChoiceOptions {
  allowNegative?: boolean;
}

export const CHOICE_COUNT = 4;
const DISTRACTOR_COUNT = CHOICE_COUNT - 1;
export const MAX_FILLER_ATTEMPTS = 30;
const MIN_PLAUSIBLE_DISTANCE = 10;
const PLAUSIBLE_DISTANCE_RATIO = 0.5;
const MAX_FILLER_OFFSET = 3;

function additionCandidates({ correctAnswer }: ChoiceParts): number[] {
  return [
    correctAnswer + 1,
    correctAnswer - 1,
    correctAnswer + 2,
    correctAnswer - 2,
    correctAnswer + 10,
    correctAnswer - 10,
  ];
}

function subtractionCandidates({
  firstOperand,
  secondOperand,
  correctAnswer,
}: ChoiceParts): number[] {
  return [
    correctAnswer + 1,
    correctAnswer - 1,
    correctAnswer + 10,
    correctAnswer - 10,
    firstOperand + secondOperand,
  ];
}

function multiplicationCandidates({ firstOperand, secondOperand }: ChoiceParts): number[] {
  return [
    (firstOperand + 1) * secondOperand,
    (firstOperand - 1) * secondOperand,
    firstOperand * (secondOperand + 1),
    firstOperand * (secondOperand - 1),
  ];
}

// The divisor is the answer to the sibling division in the same fact family.
function divisionCandidates({ secondOperand, correctAnswer }: ChoiceParts): number[] {
  return [
    correctAnswer + 1,
    correctAnswer - 1,
    correctAnswer + 2,
    correctAnswer - 2,
    secondOperand,
  ];
}

const OPERATION_CANDIDATES: Record<MathOperation, (parts: ChoiceParts) => number[]> = {
  addition: additionCandidates,
  subtraction: subtractionCandidates,
  multiplication: multiplicationCandidates,
  division: divisionCandidates,
};

function maxPlausibleDistance(correctAnswer: number): number {
  return Math.max(MIN_PLAUSIBLE_DISTANCE, Math.abs(correctAnswer) * PLAUSIBLE_DISTANCE_RATIO);
}

function createUsabilityCheck(correctAnswer: number, allowNegative: boolean) {
  const maxDistance = maxPlausibleDistance(correctAnswer);
  return (candidate: number): boolean =>
    Number.isInteger(candidate) &&
    candidate !== correctAnswer &&
    (allowNegative || candidate >= 0) &&
    Math.abs(candidate - correctAnswer) <= maxDistance;
}

function randomNearbyOffset(): number {
  return randomInt(1, MAX_FILLER_OFFSET) * pickRandom([-1, 1]);
}

function collectDistractors(parts: ChoiceParts, allowNegative: boolean): number[] {
  const { correctAnswer } = parts;
  const isUsable = createUsabilityCheck(correctAnswer, allowNegative);
  const chosen = new Set<number>();
  const tryAdd = (candidate: number): void => {
    if (chosen.size < DISTRACTOR_COUNT && isUsable(candidate)) {
      chosen.add(candidate);
    }
  };

  shuffle(OPERATION_CANDIDATES[parts.operation](parts)).forEach(tryAdd);

  for (
    let attempt = 0;
    attempt < MAX_FILLER_ATTEMPTS && chosen.size < DISTRACTOR_COUNT;
    attempt++
  ) {
    tryAdd(correctAnswer + randomNearbyOffset());
  }

  // Every answer has at least ten usable integers just above it, so this ends.
  for (let distance = 1; chosen.size < DISTRACTOR_COUNT; distance++) {
    tryAdd(correctAnswer + distance);
    tryAdd(correctAnswer - distance);
  }

  return [...chosen];
}

export function buildChoices(parts: ChoiceParts, options: ChoiceOptions = {}): number[] {
  if (!Number.isInteger(parts.correctAnswer)) {
    throw new RangeError("buildChoices: the correct answer must be an integer");
  }
  const distractors = collectDistractors(parts, options.allowNegative === true);
  return shuffle([parts.correctAnswer, ...distractors]);
}
