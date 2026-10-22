import type { MathOperation, Question } from "../types/question";
import { speakEquation, speakNumber, speakQuestion } from "./spokenMath";

function makeQuestion(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
): Question {
  return {
    id: "q",
    operation,
    firstOperand,
    secondOperand,
    displayText: "",
    correctAnswer,
    choices: [correctAnswer],
    difficulty: 1,
    source: "regular",
  };
}

describe("spokenMath", () => {
  const cases = [
    ["addition", 9, 4, 13, "What is 9 plus 4?", "9 plus 4 equals 13"],
    ["subtraction", 13, 4, 9, "What is 13 minus 4?", "13 minus 4 equals 9"],
    ["multiplication", 7, 8, 56, "What is 7 times 8?", "7 times 8 equals 56"],
    ["division", 56, 7, 8, "What is 56 divided by 7?", "56 divided by 7 equals 8"],
  ] as const;

  it.each(cases)("%s reads naturally", (op, a, b, answer, spokenQuestion, spokenEquation) => {
    const question = makeQuestion(op, a, b, answer);
    expect(speakQuestion(question)).toBe(spokenQuestion);
    expect(speakEquation(question)).toBe(spokenEquation);
  });

  it("reads negative numbers as minus", () => {
    expect(speakNumber(-3)).toBe("minus 3");
    expect(speakEquation(makeQuestion("subtraction", 2, 5, -3))).toBe("2 minus 5 equals minus 3");
  });
});
