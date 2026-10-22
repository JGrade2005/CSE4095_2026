import type { MathOperation } from "../types/question";

export const OPERATION_SYMBOLS: Record<MathOperation, string> = {
  addition: "+",
  subtraction: "−",
  multiplication: "×",
  division: "÷",
};

export function randomInt(min: number, max: number): number {
  if (min > max) {
    throw new RangeError(`randomInt: min (${min}) is greater than max (${max})`);
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("pickRandom: cannot pick from an empty list");
  }
  return items[randomInt(0, items.length - 1)];
}

// Division by zero yields a non-finite number; validation rejects it before display.
export function calculateAnswer(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
): number {
  switch (operation) {
    case "addition":
      return firstOperand + secondOperand;
    case "subtraction":
      return firstOperand - secondOperand;
    case "multiplication":
      return firstOperand * secondOperand;
    case "division":
      return firstOperand / secondOperand;
  }
}

export function formatQuestionText(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
): string {
  return `${firstOperand} ${OPERATION_SYMBOLS[operation]} ${secondOperand} = ?`;
}
