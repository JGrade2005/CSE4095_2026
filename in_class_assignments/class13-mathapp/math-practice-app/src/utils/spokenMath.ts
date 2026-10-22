import type { MathOperation, Question } from "../types/question";

const SPOKEN_OPERATORS: Record<MathOperation, string> = {
  addition: "plus",
  subtraction: "minus",
  multiplication: "times",
  division: "divided by",
};

export function speakNumber(value: number): string {
  return value < 0 ? `minus ${Math.abs(value)}` : String(value);
}

function speakExpression({ operation, firstOperand, secondOperand }: Question): string {
  return `${speakNumber(firstOperand)} ${SPOKEN_OPERATORS[operation]} ${speakNumber(secondOperand)}`;
}

export function speakQuestion(question: Question): string {
  return `What is ${speakExpression(question)}?`;
}

export function speakEquation(question: Question): string {
  return `${speakExpression(question)} equals ${speakNumber(question.correctAnswer)}`;
}
