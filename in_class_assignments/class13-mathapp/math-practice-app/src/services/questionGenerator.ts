import type { DifficultyLevel, MathOperation, Question, QuestionSource } from "../types/question";
import { calculateAnswer, formatQuestionText, pickRandom, randomInt } from "../utils/math";
import { createId } from "../utils/ids";
import { validateQuestion } from "../utils/validation";
import { buildChoices } from "./distractors";
import { DIFFICULTY_RULES, allowsNegativeAnswers, getFallbackOperands } from "./difficultyRules";
import type { LevelOptions, OperandPair } from "./difficultyRules";

export const MAX_GENERATION_ATTEMPTS = 20;

function generateAdditionOperands(difficulty: DifficultyLevel): OperandPair {
  const { operand } = DIFFICULTY_RULES[difficulty].addition;
  return {
    firstOperand: randomInt(operand.min, operand.max),
    secondOperand: randomInt(operand.min, operand.max),
  };
}

function generateSubtractionOperands(
  difficulty: DifficultyLevel,
  options: LevelOptions,
): OperandPair {
  const { operand } = DIFFICULTY_RULES[difficulty].subtraction;
  const first = randomInt(operand.min, operand.max);
  const second = randomInt(operand.min, operand.max);
  if (allowsNegativeAnswers("subtraction", difficulty, options)) {
    return { firstOperand: first, secondOperand: second };
  }
  return { firstOperand: Math.max(first, second), secondOperand: Math.min(first, second) };
}

function generateMultiplicationOperands(difficulty: DifficultyLevel): OperandPair {
  const { primary, partners } = DIFFICULTY_RULES[difficulty].multiplication;
  const partnerRange = pickRandom(partners);
  const primaryFactor = randomInt(primary.min, primary.max);
  const partnerFactor = randomInt(partnerRange.min, partnerRange.max);
  return randomInt(0, 1) === 0
    ? { firstOperand: primaryFactor, secondOperand: partnerFactor }
    : { firstOperand: partnerFactor, secondOperand: primaryFactor };
}

function generateDivisionOperands(difficulty: DifficultyLevel): OperandPair {
  const { divisor, quotient } = DIFFICULTY_RULES[difficulty].division;
  const chosenDivisor = randomInt(divisor.min, divisor.max);
  const chosenQuotient = randomInt(quotient.min, quotient.max);
  return { firstOperand: chosenDivisor * chosenQuotient, secondOperand: chosenDivisor };
}

function generateOperands(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  options: LevelOptions,
): OperandPair {
  switch (operation) {
    case "addition":
      return generateAdditionOperands(difficulty);
    case "subtraction":
      return generateSubtractionOperands(difficulty, options);
    case "multiplication":
      return generateMultiplicationOperands(difficulty);
    case "division":
      return generateDivisionOperands(difficulty);
  }
}

export function buildQuestion(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  difficulty: DifficultyLevel,
  options: LevelOptions = {},
  source: QuestionSource = "regular",
): Question {
  const correctAnswer = calculateAnswer(operation, firstOperand, secondOperand);
  return {
    id: createId(),
    operation,
    firstOperand,
    secondOperand,
    displayText: formatQuestionText(operation, firstOperand, secondOperand),
    correctAnswer,
    choices: buildChoices(
      { operation, firstOperand, secondOperand, correctAnswer },
      { allowNegative: allowsNegativeAnswers(operation, difficulty, options) },
    ),
    difficulty,
    source,
  };
}

function buildFallbackQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  options: LevelOptions,
): Question {
  const { firstOperand, secondOperand } = getFallbackOperands(operation, difficulty);
  return buildQuestion(operation, firstOperand, secondOperand, difficulty, options);
}

export function generateQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  options: LevelOptions = {},
): Question {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const { firstOperand, secondOperand } = generateOperands(operation, difficulty, options);
    const question = buildQuestion(operation, firstOperand, secondOperand, difficulty, options);
    if (validateQuestion(question, options).valid) {
      return question;
    }
  }

  if (import.meta.env.DEV) {
    console.warn(
      `Question generation failed ${MAX_GENERATION_ATTEMPTS} times for ${operation} at level ${difficulty}; using a fallback question.`,
    );
  }
  return buildFallbackQuestion(operation, difficulty, options);
}

export function generateQuestionForOperations(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  options: LevelOptions = {},
): Question {
  if (operations.length === 0) {
    throw new Error("generateQuestionForOperations: at least one operation must be enabled");
  }
  return generateQuestion(pickRandom(operations), difficulty, options);
}
