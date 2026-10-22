import { generateSimilarQuestion } from "../services/similarQuestionGenerator";
const cases: Array<[number, number, number]> = [[1, 9, 2], [0, 7, 2], [0, 3, 1], [1, 5, 1], [2, 9, 2], [0, 9, 3], [1, 50, 3]];
it.each(cases)("mult %i x %i level %i", (a, b, level) => {
  const p = { id: "z", operation: "multiplication", firstOperand: a, secondOperand: b, correctAnswer: a * b, difficulty: level, incorrectCount: 1, similarCorrectCount: 0, lastIncorrectAt: "2026-03-01T12:00:00.000Z", mastered: false } as never;
  for (let i = 0; i < 60; i++) generateSimilarQuestion(p);
});
