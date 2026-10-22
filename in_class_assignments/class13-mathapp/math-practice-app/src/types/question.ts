export const MATH_OPERATIONS = ["addition", "subtraction", "multiplication", "division"] as const;

export type MathOperation = (typeof MATH_OPERATIONS)[number];

export const DIFFICULTY_LEVELS = [1, 2, 3, 4] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export type QuestionSource = "regular" | "mistake-review";

export interface Question {
  id: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  displayText: string;
  correctAnswer: number;
  choices: number[];
  difficulty: DifficultyLevel;
  source: QuestionSource;
  mistakePatternId?: string;
}
