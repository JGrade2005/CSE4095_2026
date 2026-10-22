import type { MistakePattern } from "../types/mistake";
import { shuffle } from "../utils/shuffle";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENCY_WEIGHT = 3;
const RECENCY_HALF_LIFE_DAYS = 7;
const PROGRESS_WEIGHT = 3;

export function getActivePatterns(patterns: MistakePattern[]): MistakePattern[] {
  return patterns.filter((pattern) => !pattern.mastered);
}

// Frequency adds one point per miss, recency decays by half every week, and unfinished review
// progress adds up to PROGRESS_WEIGHT.
export function scorePattern(pattern: MistakePattern, now: Date, threshold: number): number {
  const missedAt = Date.parse(pattern.lastIncorrectAt);
  const daysAgo = Number.isNaN(missedAt)
    ? Infinity
    : Math.max(0, (now.getTime() - missedAt) / MS_PER_DAY);
  const recency = RECENCY_WEIGHT * 0.5 ** (daysAgo / RECENCY_HALF_LIFE_DAYS);
  const remaining = Math.max(0, threshold - pattern.similarCorrectCount) / Math.max(1, threshold);
  return pattern.incorrectCount + recency + PROGRESS_WEIGHT * remaining;
}

// Shuffling first makes the stable sort break ties randomly.
export function rankPatterns(
  patterns: MistakePattern[],
  now: Date,
  threshold: number,
): MistakePattern[] {
  const scored = shuffle(getActivePatterns(patterns)).map((pattern) => ({
    pattern,
    score: scorePattern(pattern, now, threshold),
  }));
  return scored.sort((a, b) => b.score - a.score).map(({ pattern }) => pattern);
}
