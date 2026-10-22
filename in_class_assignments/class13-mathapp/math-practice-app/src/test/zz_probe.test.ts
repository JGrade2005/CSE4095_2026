import { generateSimilarQuestion } from "../services/similarQuestionGenerator";
const cases: Array<[string, number, number]> = [
  ["multiplication", 0, 5], ["multiplication", 7, 0], ["division", 0, 4], ["subtraction", 5, 5], ["addition", 0, 0],
];
it.each(cases)("%s %i %i", (operation, a, b) => {
  const p = { id: "z", operation, firstOperand: a, secondOperand: b, correctAnswer: 0, difficulty: 2, incorrectCount: 1, similarCorrectCount: 0, lastIncorrectAt: "2026-03-01T12:00:00.000Z", mastered: false } as never;
  for (let i = 0; i < 50; i++) generateSimilarQuestion(p);
});
