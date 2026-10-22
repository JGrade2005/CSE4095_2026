import { DIFFICULTY_LEVELS, MATH_OPERATIONS } from "../types/question";
import type { DifficultyLevel, MathOperation } from "../types/question";
import type { AppSettings } from "../types/settings";
import type { AppStatistics, OperationStatistics } from "../types/statistics";

export const DEFAULT_SETTINGS: AppSettings = {
  soundEffectsEnabled: true,
  cardAnimationEnabled: true,
  showExplanations: true,
  defaultSessionLength: 10,
  defaultDifficulty: 1,
  defaultOperations: ["addition"],
  masteryThreshold: 3,
  allowNegativeSubtraction: false,
};

// Fresh copy so callers can never mutate the shared defaults array.
export function createDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, defaultOperations: [...DEFAULT_SETTINGS.defaultOperations] };
}

function createEmptyCounts(): OperationStatistics {
  return { attempted: 0, correct: 0, incorrect: 0 };
}

export function createEmptyStatistics(): AppStatistics {
  const byOperation = {} as Record<MathOperation, OperationStatistics>;
  for (const operation of MATH_OPERATIONS) {
    byOperation[operation] = createEmptyCounts();
  }
  const byDifficulty = {} as Record<DifficultyLevel, OperationStatistics>;
  for (const level of DIFFICULTY_LEVELS) {
    byDifficulty[level] = createEmptyCounts();
  }
  return { ...createEmptyCounts(), byOperation, byDifficulty };
}
