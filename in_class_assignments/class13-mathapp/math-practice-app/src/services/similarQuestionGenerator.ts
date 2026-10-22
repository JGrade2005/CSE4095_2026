import type { MathOperation, Question } from "../types/question";
import type { MistakePattern } from "../types/mistake";
import { calculateAnswer } from "../utils/math";
import { shuffle } from "../utils/shuffle";
import { validateQuestion } from "../utils/validation";
import { buildQuestion, generateQuestion } from "./questionGenerator";
import type { LevelOptions } from "./difficultyRules";

interface Candidate {
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
}

type Strategy = (pattern: MistakePattern) => Candidate[];

const NEARBY_OFFSETS = [-2, -1, 1, 2];

function divisionCandidate(divisor: number, quotient: number): Candidate {
  return { operation: "division", firstOperand: divisor * quotient, secondOperand: divisor };
}

function nearbyNumbers(pattern: MistakePattern): Candidate[] {
  const { operation, firstOperand, secondOperand } = pattern;
  if (operation === "division") {
    // Changing the dividend directly would break whole-number division.
    if (secondOperand === 0) {
      return [];
    }
    const quotient = firstOperand / secondOperand;
    return NEARBY_OFFSETS.flatMap((offset) => [
      divisionCandidate(secondOperand + offset, quotient),
      divisionCandidate(secondOperand, quotient + offset),
    ]).filter((candidate) => candidate.secondOperand !== 0);
  }
  return NEARBY_OFFSETS.flatMap((offset) => [
    { operation, firstOperand: firstOperand + offset, secondOperand },
    { operation, firstOperand, secondOperand: secondOperand + offset },
  ]);
}

function reversedOperands(pattern: MistakePattern): Candidate[] {
  const { operation, firstOperand, secondOperand } = pattern;
  return [{ operation, firstOperand: secondOperand, secondOperand: firstOperand }];
}

function multiplicationToDivision({ firstOperand, secondOperand }: MistakePattern): Candidate[] {
  const product = firstOperand * secondOperand;
  return [firstOperand, secondOperand]
    .filter((divisor) => divisor !== 0)
    .map((divisor) => ({
      operation: "division",
      firstOperand: product,
      secondOperand: divisor,
    }));
}

function divisionToMultiplication({ firstOperand, secondOperand }: MistakePattern): Candidate[] {
  if (secondOperand === 0) {
    return [];
  }
  const quotient = firstOperand / secondOperand;
  return [
    { operation: "multiplication", firstOperand: secondOperand, secondOperand: quotient },
    { operation: "multiplication", firstOperand: quotient, secondOperand: secondOperand },
  ];
}

function additionToSubtraction({ firstOperand, secondOperand }: MistakePattern): Candidate[] {
  const sum = firstOperand + secondOperand;
  return [firstOperand, secondOperand].map((part) => ({
    operation: "subtraction",
    firstOperand: sum,
    secondOperand: part,
  }));
}

function subtractionToAddition({ firstOperand, secondOperand }: MistakePattern): Candidate[] {
  const difference = firstOperand - secondOperand;
  return [
    { operation: "addition", firstOperand: difference, secondOperand },
    { operation: "addition", firstOperand: secondOperand, secondOperand: difference },
  ];
}

const INVERSE_STRATEGIES: Record<MathOperation, Strategy> = {
  multiplication: multiplicationToDivision,
  division: divisionToMultiplication,
  addition: additionToSubtraction,
  subtraction: subtractionToAddition,
};

// Reversing subtraction or division changes the problem, so only commutative operations reverse.
const COMMUTATIVE_OPERATIONS: MathOperation[] = ["addition", "multiplication"];

function applicableStrategies(operation: MathOperation): Strategy[] {
  const strategies = [nearbyNumbers, INVERSE_STRATEGIES[operation]];
  if (COMMUTATIVE_OPERATIONS.includes(operation)) {
    strategies.push(reversedOperands);
  }
  return strategies;
}

function isSameQuestion(candidate: Candidate, pattern: MistakePattern): boolean {
  return (
    candidate.operation === pattern.operation &&
    candidate.firstOperand === pattern.firstOperand &&
    candidate.secondOperand === pattern.secondOperand
  );
}

function toReviewQuestion(
  candidate: Candidate,
  pattern: MistakePattern,
  options: LevelOptions,
): Question {
  return buildQuestion(
    candidate.operation,
    candidate.firstOperand,
    candidate.secondOperand,
    pattern.difficulty,
    options,
    "mistake-review",
  );
}

function findValidQuestion(
  candidates: Candidate[],
  pattern: MistakePattern,
  options: LevelOptions,
): Question | undefined {
  for (const candidate of shuffle(candidates)) {
    const question = toReviewQuestion(candidate, pattern, options);
    if (validateQuestion(question, options).valid) {
      return { ...question, mistakePatternId: pattern.id };
    }
  }
  return undefined;
}

function generateFallbackQuestion(pattern: MistakePattern, options: LevelOptions): Question {
  return {
    ...generateQuestion(pattern.operation, pattern.difficulty, options),
    source: "mistake-review",
    mistakePatternId: pattern.id,
  };
}

function hasWholeAnswer(candidate: Candidate): boolean {
  return Number.isInteger(
    calculateAnswer(candidate.operation, candidate.firstOperand, candidate.secondOperand),
  );
}

function buildCandidateGroups(pattern: MistakePattern): Candidate[][] {
  return shuffle(applicableStrategies(pattern.operation)).map((strategy) =>
    strategy(pattern).filter(
      (candidate) => hasWholeAnswer(candidate) && !isSameQuestion(candidate, pattern),
    ),
  );
}

export function generateSimilarQuestion(
  pattern: MistakePattern,
  options: LevelOptions = {},
): Question {
  for (const group of buildCandidateGroups(pattern)) {
    const question = findValidQuestion(group, pattern, options);
    if (question) {
      return question;
    }
  }

  const original: Candidate = {
    operation: pattern.operation,
    firstOperand: pattern.firstOperand,
    secondOperand: pattern.secondOperand,
  };
  const repeated = hasWholeAnswer(original)
    ? findValidQuestion([original], pattern, options)
    : undefined;
  return repeated ?? generateFallbackQuestion(pattern, options);
}
