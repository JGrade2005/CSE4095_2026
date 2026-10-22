import type { MistakePattern } from "../types/mistake";
import type { DifficultyLevel, MathOperation, Question } from "../types/question";
import type { SessionConfig } from "../types/session";
import { pickRandom } from "../utils/math";
import type { LevelOptions } from "./difficultyRules";
import { getActivePatterns, rankPatterns } from "./reviewPriority";
import { generateSimilarQuestion } from "./similarQuestionGenerator";

// Choosing among the top few ranked patterns mixes them while still favoring the urgent ones.
const TOP_CANDIDATES = 3;

export function getReviewablePatterns(
  patterns: MistakePattern[],
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
): MistakePattern[] {
  return getActivePatterns(patterns).filter(
    (pattern) => operations.includes(pattern.operation) && pattern.difficulty === difficulty,
  );
}

export function pickReviewPattern(
  patterns: MistakePattern[],
  now: Date,
  threshold: number,
  previousPatternId?: string,
): MistakePattern | null {
  const ranked = rankPatterns(patterns, now, threshold);
  const others = ranked.filter((pattern) => pattern.id !== previousPatternId);
  const pool = others.length > 0 ? others : ranked;
  if (pool.length === 0) return null;
  return pickRandom(pool.slice(0, TOP_CANDIDATES));
}

export function buildReviewQuestion(
  patterns: MistakePattern[],
  config: Pick<SessionConfig, "operations" | "difficulty">,
  now: Date,
  threshold: number,
  options: LevelOptions = {},
  previousPatternId?: string,
): Question | null {
  const reviewable = getReviewablePatterns(patterns, config.operations, config.difficulty);
  const pattern = pickReviewPattern(reviewable, now, threshold, previousPatternId);
  return pattern ? generateSimilarQuestion(pattern, options) : null;
}
