import type { DifficultyLevel, MathOperation } from "./question";
import type { SessionLength } from "./session";

export interface AppSettings {
  soundEffectsEnabled: boolean;
  cardAnimationEnabled: boolean;
  showExplanations: boolean;
  defaultSessionLength: SessionLength;
  defaultDifficulty: DifficultyLevel;
  defaultOperations: MathOperation[];
  masteryThreshold: number;
}
