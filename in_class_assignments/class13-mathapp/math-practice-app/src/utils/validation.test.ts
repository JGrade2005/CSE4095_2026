import { describe, expect, it } from "vitest";
import type { DifficultyLevel, MathOperation, Question } from "../types/question";
import { validateQuestion } from "./validation";

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    operation: "multiplication",
    firstOperand: 8,
    secondOperand: 7,
    displayText: "8 × 7 = ?",
    correctAnswer: 56,
    choices: [48, 54, 56, 64],
    difficulty: 3,
    source: "regular",
    ...overrides,
  };
}

function expectInvalid(question: Question, reasonPart: string, options = {}) {
  const result = validateQuestion(question, options);
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.reason.toLowerCase()).toContain(reasonPart);
  }
}

describe("validateQuestion", () => {
  it("accepts a well-formed question", () => {
    expect(validateQuestion(makeQuestion())).toEqual({ valid: true });
  });

  it("rejects an unsupported operation", () => {
    expectInvalid(makeQuestion({ operation: "modulo" as unknown as MathOperation }), "unsupported");
  });

  it("rejects an unsupported difficulty level", () => {
    expectInvalid(makeQuestion({ difficulty: 9 as DifficultyLevel }), "difficulty");
  });

  it("rejects 3 or 5 choices", () => {
    expectInvalid(makeQuestion({ choices: [48, 56, 64] }), "exactly 4");
    expectInvalid(makeQuestion({ choices: [48, 54, 56, 64, 70] }), "exactly 4");
  });

  it("rejects duplicate choices", () => {
    expectInvalid(makeQuestion({ choices: [48, 48, 56, 64] }), "unique");
  });

  it("rejects a choice list missing the correct answer", () => {
    expectInvalid(makeQuestion({ choices: [48, 54, 55, 64] }), "equal the correct answer");
  });

  it("rejects non-integer choices", () => {
    expectInvalid(makeQuestion({ choices: [48, 54.5, 56, 64] }), "whole number");
  });

  it("rejects division by zero", () => {
    expectInvalid(
      makeQuestion({
        operation: "division",
        firstOperand: 0,
        secondOperand: 0,
        correctAnswer: 0,
        choices: [0, 1, 2, 3],
      }),
      "zero",
    );
  });

  it("rejects a fractional division answer", () => {
    expectInvalid(
      makeQuestion({
        operation: "division",
        firstOperand: 7,
        secondOperand: 2,
        correctAnswer: 3.5,
        choices: [1, 2, 3, 4],
      }),
      "whole",
    );
  });

  it("rejects a correct answer that is not finite or not an integer", () => {
    expectInvalid(makeQuestion({ correctAnswer: Number.NaN }), "whole number");
    expectInvalid(makeQuestion({ correctAnswer: Infinity }), "whole number");
    expectInvalid(makeQuestion({ correctAnswer: 56.5 }), "whole number");
  });

  it("rejects a correct answer that does not match the operands", () => {
    expectInvalid(makeQuestion({ correctAnswer: 54, choices: [48, 54, 55, 64] }), "match");
  });

  it("rejects fractional operands", () => {
    expectInvalid(makeQuestion({ firstOperand: 8.5 }), "whole numbers");
  });

  it("rejects operands outside the level", () => {
    expectInvalid(
      makeQuestion({
        operation: "addition",
        firstOperand: 11,
        secondOperand: 2,
        correctAnswer: 13,
        choices: [11, 12, 13, 14],
        difficulty: 1,
      }),
      "difficulty level",
    );
  });

  it("rejects a subtraction with a negative answer unless L4 allows it", () => {
    const negative = makeQuestion({
      operation: "subtraction",
      firstOperand: 20,
      secondOperand: 50,
      correctAnswer: -30,
      choices: [-30, -29, -31, -20],
      difficulty: 4,
    });
    expectInvalid(negative, "difficulty level");
    expect(validateQuestion(negative, { allowNegativeSubtraction: true })).toEqual({ valid: true });
    expectInvalid({ ...negative, difficulty: 3 }, "difficulty level", {
      allowNegativeSubtraction: true,
    });
  });
});
