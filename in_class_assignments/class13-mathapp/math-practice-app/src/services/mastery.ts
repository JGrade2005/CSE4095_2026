import type { MistakePattern } from "../types/mistake";

export const DEFAULT_MASTERY_THRESHOLD = 3;

// A miss is counted by recordIncorrectAnswer, so a wrong review answer only resets progress here.
export function applyReviewResult(
  pattern: MistakePattern,
  correct: boolean,
  threshold: number = DEFAULT_MASTERY_THRESHOLD,
): MistakePattern {
  if (!correct) {
    return { ...pattern, similarCorrectCount: 0, mastered: false };
  }
  const similarCorrectCount = pattern.similarCorrectCount + 1;
  return { ...pattern, similarCorrectCount, mastered: similarCorrectCount >= threshold };
}
