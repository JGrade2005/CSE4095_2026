import type { DifficultyLevel, MathOperation, Question } from "../types/question";

export interface Range {
  min: number;
  max: number;
}

export interface LevelOptions {
  allowNegativeSubtraction?: boolean;
}

export interface OperandPair {
  firstOperand: number;
  secondOperand: number;
}

interface AdditionRule {
  operand: Range;
  maxSum: number;
}

interface SubtractionRule {
  operand: Range;
}

// One factor must fit `primary`; the other must fit one of `partners`, in either order.
interface MultiplicationRule {
  primary: Range;
  partners: Range[];
}

interface DivisionRule {
  divisor: Range;
  quotient: Range;
}

interface LevelRules {
  addition: AdditionRule;
  subtraction: SubtractionRule;
  multiplication: MultiplicationRule;
  division: DivisionRule;
}

export const DIFFICULTY_RULES: Record<DifficultyLevel, LevelRules> = {
  1: {
    addition: { operand: { min: 0, max: 10 }, maxSum: 20 },
    subtraction: { operand: { min: 0, max: 10 } },
    multiplication: { primary: { min: 0, max: 5 }, partners: [{ min: 0, max: 5 }] },
    division: { divisor: { min: 1, max: 5 }, quotient: { min: 0, max: 5 } },
  },
  2: {
    addition: { operand: { min: 0, max: 50 }, maxSum: 100 },
    subtraction: { operand: { min: 0, max: 50 } },
    multiplication: { primary: { min: 0, max: 10 }, partners: [{ min: 0, max: 10 }] },
    division: { divisor: { min: 1, max: 10 }, quotient: { min: 0, max: 10 } },
  },
  3: {
    addition: { operand: { min: 0, max: 100 }, maxSum: 200 },
    subtraction: { operand: { min: 0, max: 100 } },
    multiplication: {
      primary: { min: 0, max: 9 },
      partners: [
        { min: 0, max: 9 },
        { min: 10, max: 99 },
      ],
    },
    division: { divisor: { min: 1, max: 12 }, quotient: { min: 0, max: 12 } },
  },
  4: {
    addition: { operand: { min: 10, max: 999 }, maxSum: 1998 },
    subtraction: { operand: { min: 10, max: 999 } },
    multiplication: {
      primary: { min: 10, max: 99 },
      partners: [
        { min: 2, max: 9 },
        { min: 10, max: 99 },
      ],
    },
    division: { divisor: { min: 2, max: 20 }, quotient: { min: 10, max: 50 } },
  },
};

export function allowsNegativeAnswers(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  options: LevelOptions = {},
): boolean {
  return (
    operation === "subtraction" && difficulty === 4 && options.allowNegativeSubtraction === true
  );
}

function isInRange(value: number, range: Range): boolean {
  return value >= range.min && value <= range.max;
}

function fitsMultiplication(primary: number, partner: number, rule: MultiplicationRule): boolean {
  return (
    isInRange(primary, rule.primary) && rule.partners.some((range) => isInRange(partner, range))
  );
}

export function isWithinLevel(
  question: Pick<Question, "operation" | "firstOperand" | "secondOperand" | "difficulty">,
  options: LevelOptions = {},
): boolean {
  const rules = DIFFICULTY_RULES[question.difficulty];
  if (!rules) {
    return false;
  }
  const { operation, firstOperand: first, secondOperand: second } = question;

  switch (operation) {
    case "addition": {
      const { operand, maxSum } = rules.addition;
      return isInRange(first, operand) && isInRange(second, operand) && first + second <= maxSum;
    }
    case "subtraction": {
      const bothInRange =
        isInRange(first, rules.subtraction.operand) && isInRange(second, rules.subtraction.operand);
      const orderAllowed =
        first >= second || allowsNegativeAnswers(operation, question.difficulty, options);
      return bothInRange && orderAllowed;
    }
    case "multiplication": {
      const rule = rules.multiplication;
      return fitsMultiplication(first, second, rule) || fitsMultiplication(second, first, rule);
    }
    case "division": {
      const { divisor, quotient } = rules.division;
      return (
        second !== 0 &&
        first % second === 0 &&
        isInRange(second, divisor) &&
        isInRange(first / second, quotient)
      );
    }
    default:
      return false;
  }
}

export function getFallbackOperands(
  operation: MathOperation,
  difficulty: DifficultyLevel,
): OperandPair {
  const rules = DIFFICULTY_RULES[difficulty];
  switch (operation) {
    case "addition":
      return {
        firstOperand: rules.addition.operand.min,
        secondOperand: rules.addition.operand.min,
      };
    case "subtraction":
      return {
        firstOperand: rules.subtraction.operand.min,
        secondOperand: rules.subtraction.operand.min,
      };
    case "multiplication":
      return {
        firstOperand: rules.multiplication.primary.min,
        secondOperand: rules.multiplication.partners[0].min,
      };
    case "division":
      return {
        firstOperand: rules.division.divisor.min * rules.division.quotient.min,
        secondOperand: rules.division.divisor.min,
      };
  }
}
