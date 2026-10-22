import type { Question } from "../types/question";

function formatNumber(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

function explainAddition({ firstOperand, secondOperand, correctAnswer }: Question): string {
  return `${firstOperand} + ${secondOperand} = ${correctAnswer}. Start at ${firstOperand} and count up ${secondOperand} more.`;
}

function explainSubtraction({ firstOperand, secondOperand, correctAnswer }: Question): string {
  if (correctAnswer < 0) {
    return `${firstOperand} − ${secondOperand} = ${formatNumber(correctAnswer)}. Counting back ${secondOperand} from ${firstOperand} goes below zero.`;
  }
  return `${firstOperand} − ${secondOperand} = ${correctAnswer} because ${correctAnswer} + ${secondOperand} = ${firstOperand}.`;
}

function explainMultiplication({ firstOperand, secondOperand, correctAnswer }: Question): string {
  const groups = firstOperand === 1 ? "group" : "groups";
  return `${firstOperand} × ${secondOperand} means ${firstOperand} ${groups} of ${secondOperand}, which is ${correctAnswer}.`;
}

function explainDivision({ firstOperand, secondOperand, correctAnswer }: Question): string {
  return `${firstOperand} ÷ ${secondOperand} = ${correctAnswer} because ${secondOperand} × ${correctAnswer} = ${firstOperand}.`;
}

export function explainQuestion(question: Question): string {
  switch (question.operation) {
    case "addition":
      return explainAddition(question);
    case "subtraction":
      return explainSubtraction(question);
    case "multiplication":
      return explainMultiplication(question);
    case "division":
      return explainDivision(question);
  }
}
