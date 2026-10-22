import { describe, expect, it } from "vitest";
import type { MathOperation, Question } from "../types/question";
import { calculateAnswer } from "../utils/math";
import { explainQuestion } from "./explanations";

function questionFor(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
): Question {
  const correctAnswer = calculateAnswer(operation, firstOperand, secondOperand);
  return {
    id: "q",
    operation,
    firstOperand,
    secondOperand,
    displayText: "",
    correctAnswer,
    choices: [correctAnswer, correctAnswer + 1, correctAnswer + 2, correctAnswer + 3],
    difficulty: 3,
    source: "regular",
  };
}

describe("explainQuestion", () => {
  it("explains multiplication as groups", () => {
    expect(explainQuestion(questionFor("multiplication", 8, 7))).toBe(
      "8 × 7 means 8 groups of 7, which is 56.",
    );
  });

  it("uses the singular for one group", () => {
    expect(explainQuestion(questionFor("multiplication", 1, 7))).toContain("1 group of 7");
  });

  it("explains division with its multiplication fact", () => {
    expect(explainQuestion(questionFor("division", 56, 7))).toBe("56 ÷ 7 = 8 because 7 × 8 = 56.");
  });

  it("explains subtraction with the matching addition", () => {
    expect(explainQuestion(questionFor("subtraction", 13, 4))).toBe(
      "13 − 4 = 9 because 9 + 4 = 13.",
    );
  });

  it("explains a negative subtraction answer", () => {
    const text = explainQuestion(questionFor("subtraction", 7, 10));
    expect(text).toContain("−3");
    expect(text).toContain("below zero");
  });

  it("explains addition by counting up", () => {
    const text = explainQuestion(questionFor("addition", 23, 14));
    expect(text).toContain("23 + 14 = 37");
    expect(text).toContain("count up 14");
  });

  it("returns a short non-empty string for every operation", () => {
    const questions = [
      questionFor("addition", 5, 6),
      questionFor("subtraction", 9, 2),
      questionFor("multiplication", 3, 4),
      questionFor("division", 12, 3),
    ];
    for (const question of questions) {
      const text = explainQuestion(question);
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThan(120);
    }
  });
});
