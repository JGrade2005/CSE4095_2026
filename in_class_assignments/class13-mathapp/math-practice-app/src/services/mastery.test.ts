import { describe, expect, it } from "vitest";
import { applyReviewResult, DEFAULT_MASTERY_THRESHOLD } from "./mastery";
import { recordIncorrectAnswer } from "./mistakeService";
import type { MistakePattern } from "../types/mistake";

function pattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: "p1",
    operation: "multiplication",
    firstOperand: 7,
    secondOperand: 8,
    correctAnswer: 56,
    difficulty: 2,
    incorrectCount: 2,
    similarCorrectCount: 0,
    lastIncorrectAt: "2026-03-01T12:00:00.000Z",
    mastered: false,
    ...overrides,
  };
}

describe("applyReviewResult", () => {
  it("defaults the threshold to three", () => {
    expect(DEFAULT_MASTERY_THRESHOLD).toBe(3);
  });

  it("masters a pattern at the third correct answer, not the second", () => {
    const first = applyReviewResult(pattern(), true, 3);
    const second = applyReviewResult(first, true, 3);
    expect(second).toMatchObject({ similarCorrectCount: 2, mastered: false });

    const third = applyReviewResult(second, true, 3);
    expect(third).toMatchObject({ similarCorrectCount: 3, mastered: true });
  });

  it("respects a threshold of 5", () => {
    let current = pattern();
    for (let count = 1; count <= 4; count++) {
      current = applyReviewResult(current, true, 5);
      expect(current.mastered).toBe(false);
    }
    current = applyReviewResult(current, true, 5);
    expect(current).toMatchObject({ similarCorrectCount: 5, mastered: true });
  });

  it("resets progress and clears mastery on an incorrect answer", () => {
    const result = applyReviewResult(pattern({ similarCorrectCount: 2 }), false, 3);
    expect(result).toMatchObject({ similarCorrectCount: 0, mastered: false, incorrectCount: 2 });

    const masteredThenMissed = applyReviewResult(
      pattern({ similarCorrectCount: 3, mastered: true }),
      false,
      3,
    );
    expect(masteredThenMissed).toMatchObject({ similarCorrectCount: 0, mastered: false });
  });

  it("does not mutate the original pattern", () => {
    const original = pattern();
    applyReviewResult(original, true, 3);
    expect(original.similarCorrectCount).toBe(0);
  });

  it("brings a mastered pattern back to active after a new miss", () => {
    const mastered = pattern({ similarCorrectCount: 3, mastered: true });
    const [revived] = recordIncorrectAnswer([mastered], {
      operation: "multiplication",
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
      difficulty: 2,
    });
    expect(revived).toMatchObject({ mastered: false, similarCorrectCount: 0, incorrectCount: 3 });
  });
});
