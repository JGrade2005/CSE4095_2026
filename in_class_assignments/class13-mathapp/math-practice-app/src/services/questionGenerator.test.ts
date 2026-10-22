import { afterEach, describe, expect, it, vi } from "vitest";
import { DIFFICULTY_LEVELS, MATH_OPERATIONS } from "../types/question";
import type { DifficultyLevel, MathOperation, Question } from "../types/question";
import { validateQuestion } from "../utils/validation";
import { getFallbackOperands } from "./difficultyRules";
import { buildChoices } from "./distractors";
import {
  MAX_GENERATION_ATTEMPTS,
  generateQuestion,
  generateQuestionForOperations,
} from "./questionGenerator";

vi.mock("./distractors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./distractors")>();
  return { ...actual, buildChoices: vi.fn(actual.buildChoices) };
});

const SAMPLES = 500;

type Range = readonly [number, number];

const ADD_SUB_RANGE: Record<DifficultyLevel, Range> = {
  1: [0, 10],
  2: [0, 50],
  3: [0, 100],
  4: [10, 999],
};
const MAX_SUM: Record<DifficultyLevel, number> = { 1: 20, 2: 100, 3: 200, 4: 1998 };
const SMALL_FACTOR_RANGE: Record<DifficultyLevel, Range> = {
  1: [0, 5],
  2: [0, 10],
  3: [0, 9],
  4: [10, 99],
};
const PARTNER_RANGES: Record<DifficultyLevel, Range[]> = {
  1: [[0, 5]],
  2: [[0, 10]],
  3: [
    [0, 9],
    [10, 99],
  ],
  4: [
    [2, 9],
    [10, 99],
  ],
};
const DIVISOR_RANGE: Record<DifficultyLevel, Range> = {
  1: [1, 5],
  2: [1, 10],
  3: [1, 12],
  4: [2, 20],
};
const QUOTIENT_RANGE: Record<DifficultyLevel, Range> = {
  1: [0, 5],
  2: [0, 10],
  3: [0, 12],
  4: [10, 50],
};

function inRange(value: number, [min, max]: Range): boolean {
  return value >= min && value <= max;
}

function fitsFactorRule(small: number, partner: number, level: DifficultyLevel): boolean {
  return (
    inRange(small, SMALL_FACTOR_RANGE[level]) &&
    PARTNER_RANGES[level].some((range) => inRange(partner, range))
  );
}

function sample(count: number, make: () => Question): Question[] {
  return Array.from({ length: count }, make);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("generateQuestion for every operation and level", () => {
  const pairs = MATH_OPERATIONS.flatMap((operation) =>
    DIFFICULTY_LEVELS.map((level) => [operation, level] as const),
  );

  it.each(pairs)("%s at level %i builds valid questions", (operation, level) => {
    const questions = sample(SAMPLES, () => generateQuestion(operation, level));
    const ids = new Set<string>();
    for (const question of questions) {
      expect(validateQuestion(question)).toEqual({ valid: true });
      expect(question.operation).toBe(operation);
      expect(question.difficulty).toBe(level);
      expect(question.source).toBe("regular");
      expect(question.mistakePatternId).toBeUndefined();
      expect(question.choices).toHaveLength(4);
      expect(question.choices.filter((c) => c === question.correctAnswer)).toHaveLength(1);
      ids.add(question.id);
    }
    expect(ids.size).toBe(SAMPLES);
  });
});

describe("addition", () => {
  it.each(DIFFICULTY_LEVELS)("keeps operands in range and sums capped at level %i", (level) => {
    const seen = { min: Infinity, max: -Infinity };
    for (const question of sample(SAMPLES, () => generateQuestion("addition", level))) {
      for (const operand of [question.firstOperand, question.secondOperand]) {
        expect(inRange(operand, ADD_SUB_RANGE[level])).toBe(true);
        seen.min = Math.min(seen.min, operand);
        seen.max = Math.max(seen.max, operand);
      }
      expect(question.correctAnswer).toBe(question.firstOperand + question.secondOperand);
      expect(question.correctAnswer).toBeLessThanOrEqual(MAX_SUM[level]);
    }
    if (level === 1) expect(seen).toEqual({ min: 0, max: 10 });
  });

  it("caps the sum at 20 for level 1 and 100 for level 2", () => {
    for (const question of sample(SAMPLES, () => generateQuestion("addition", 1))) {
      expect(question.correctAnswer).toBeLessThanOrEqual(20);
    }
    for (const question of sample(SAMPLES, () => generateQuestion("addition", 2))) {
      expect(question.correctAnswer).toBeLessThanOrEqual(100);
    }
  });

  it("reaches the minimum and maximum operand values with a controlled random source", () => {
    const random = vi.spyOn(Math, "random");
    random.mockReturnValue(0);
    const low = generateQuestion("addition", 2);
    expect([low.firstOperand, low.secondOperand]).toEqual([0, 0]);
    random.mockReturnValue(0.999999);
    const high = generateQuestion("addition", 2);
    expect([high.firstOperand, high.secondOperand]).toEqual([50, 50]);
  });

  it("formats display text as 'a + b = ?'", () => {
    const question = generateQuestion("addition", 2);
    expect(question.displayText).toBe(`${question.firstOperand} + ${question.secondOperand} = ?`);
  });
});

describe("subtraction", () => {
  it.each(DIFFICULTY_LEVELS)(
    "keeps the first operand at least the second, with no negative answers, at level %i",
    (level) => {
      for (const question of sample(SAMPLES, () => generateQuestion("subtraction", level))) {
        expect(inRange(question.firstOperand, ADD_SUB_RANGE[level])).toBe(true);
        expect(inRange(question.secondOperand, ADD_SUB_RANGE[level])).toBe(true);
        expect(question.firstOperand).toBeGreaterThanOrEqual(question.secondOperand);
        expect(question.correctAnswer).toBe(question.firstOperand - question.secondOperand);
        expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(question.choices.every((choice) => choice >= 0)).toBe(true);
      }
    },
  );

  it("ignores allowNegativeSubtraction below level 4", () => {
    for (const level of [1, 2, 3] as const) {
      for (const question of sample(200, () =>
        generateQuestion("subtraction", level, { allowNegativeSubtraction: true }),
      )) {
        expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("allows negative answers at level 4 only when the option is on", () => {
    const withOption = sample(SAMPLES, () =>
      generateQuestion("subtraction", 4, { allowNegativeSubtraction: true }),
    );
    expect(withOption.some((question) => question.correctAnswer < 0)).toBe(true);
    for (const question of withOption) {
      expect(validateQuestion(question, { allowNegativeSubtraction: true }).valid).toBe(true);
      expect(inRange(question.firstOperand, ADD_SUB_RANGE[4])).toBe(true);
      expect(inRange(question.secondOperand, ADD_SUB_RANGE[4])).toBe(true);
    }
    const withoutOption = sample(SAMPLES, () => generateQuestion("subtraction", 4));
    expect(withoutOption.every((question) => question.correctAnswer >= 0)).toBe(true);
  });

  it("formats display text with the minus sign", () => {
    const question = generateQuestion("subtraction", 1);
    expect(question.displayText).toBe(`${question.firstOperand} − ${question.secondOperand} = ?`);
  });
});

describe("multiplication", () => {
  it.each(DIFFICULTY_LEVELS)("follows the factor rules at level %i", (level) => {
    let firstIsSmallSide = 0;
    for (const question of sample(SAMPLES, () => generateQuestion("multiplication", level))) {
      const { firstOperand: first, secondOperand: second } = question;
      const fits = fitsFactorRule(first, second, level) || fitsFactorRule(second, first, level);
      expect(fits).toBe(true);
      expect(question.correctAnswer).toBe(first * second);
      if (
        inRange(first, SMALL_FACTOR_RANGE[level]) &&
        !inRange(second, SMALL_FACTOR_RANGE[level])
      ) {
        firstIsSmallSide++;
      }
    }
    if (level === 3 || level === 4) {
      expect(firstIsSmallSide).toBeGreaterThan(0);
    }
  });

  it("produces both one-digit and two-digit partners at level 3, in either order", () => {
    const questions = sample(SAMPLES, () => generateQuestion("multiplication", 3));
    expect(questions.some((q) => q.firstOperand >= 10)).toBe(true);
    expect(questions.some((q) => q.secondOperand >= 10)).toBe(true);
    expect(questions.some((q) => q.firstOperand <= 9 && q.secondOperand <= 9)).toBe(true);
  });

  it("produces one-digit and two-digit partners at level 4 with both factors at least 2", () => {
    const questions = sample(SAMPLES, () => generateQuestion("multiplication", 4));
    expect(questions.some((q) => Math.min(q.firstOperand, q.secondOperand) <= 9)).toBe(true);
    expect(questions.some((q) => Math.min(q.firstOperand, q.secondOperand) >= 10)).toBe(true);
    for (const question of questions) {
      expect(Math.min(question.firstOperand, question.secondOperand)).toBeGreaterThanOrEqual(2);
      expect(Math.max(question.firstOperand, question.secondOperand)).toBeGreaterThanOrEqual(10);
    }
  });

  it("formats display text with the multiplication sign", () => {
    const question = generateQuestion("multiplication", 2);
    expect(question.displayText).toBe(`${question.firstOperand} × ${question.secondOperand} = ?`);
  });
});

describe("division", () => {
  it.each(DIFFICULTY_LEVELS)(
    "builds the dividend from divisor and quotient at level %i",
    (level) => {
      for (const question of sample(SAMPLES, () => generateQuestion("division", level))) {
        const divisor = question.secondOperand;
        expect(divisor).not.toBe(0);
        expect(inRange(divisor, DIVISOR_RANGE[level])).toBe(true);
        expect(Number.isInteger(question.correctAnswer)).toBe(true);
        expect(inRange(question.correctAnswer, QUOTIENT_RANGE[level])).toBe(true);
        expect(question.firstOperand).toBe(divisor * question.correctAnswer);
        expect(question.firstOperand % divisor).toBe(0);
      }
    },
  );

  it("keeps the dividend at most 144 at level 3", () => {
    for (const question of sample(SAMPLES, () => generateQuestion("division", 3))) {
      expect(question.firstOperand).toBeLessThanOrEqual(144);
    }
  });

  it("never produces a zero divisor even at the lowest random value", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    for (const level of DIFFICULTY_LEVELS) {
      const question = generateQuestion("division", level);
      expect(question.secondOperand).toBeGreaterThanOrEqual(1);
      expect(validateQuestion(question).valid).toBe(true);
    }
  });

  it("formats display text with the division sign", () => {
    const question = generateQuestion("division", 2);
    expect(question.displayText).toBe(`${question.firstOperand} ÷ ${question.secondOperand} = ?`);
  });
});

describe("failure handling", () => {
  const badChoices = [1, 1, 2, 3];

  it("retries when a generated question is invalid and then succeeds", () => {
    vi.mocked(buildChoices).mockClear();
    vi.mocked(buildChoices)
      .mockReturnValueOnce(badChoices)
      .mockReturnValueOnce(badChoices)
      .mockReturnValueOnce(badChoices);
    const question = generateQuestion("addition", 2);
    expect(vi.mocked(buildChoices)).toHaveBeenCalledTimes(4);
    expect(validateQuestion(question).valid).toBe(true);
  });

  it("returns a valid fallback after the attempt limit and warns in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(buildChoices).mockClear();
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      vi.mocked(buildChoices).mockReturnValueOnce(badChoices);
    }
    const question = generateQuestion("division", 3);
    const fallback = getFallbackOperands("division", 3);
    expect(vi.mocked(buildChoices)).toHaveBeenCalledTimes(MAX_GENERATION_ATTEMPTS + 1);
    expect([question.firstOperand, question.secondOperand]).toEqual([
      fallback.firstOperand,
      fallback.secondOperand,
    ]);
    expect(validateQuestion(question).valid).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn outside development", () => {
    vi.stubEnv("DEV", false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      vi.mocked(buildChoices).mockReturnValueOnce(badChoices);
    }
    generateQuestion("addition", 1);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(
    MATH_OPERATIONS.flatMap((operation) =>
      DIFFICULTY_LEVELS.map((level) => [operation, level] as const),
    ),
  )("has a valid fallback for %s at level %i", (operation, level) => {
    const { firstOperand, secondOperand } = getFallbackOperands(operation, level);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      vi.mocked(buildChoices).mockReturnValueOnce(badChoices);
    }
    const question = generateQuestion(operation, level);
    expect([question.firstOperand, question.secondOperand]).toEqual([firstOperand, secondOperand]);
    expect(validateQuestion(question)).toEqual({ valid: true });
  });
});

describe("generateQuestionForOperations", () => {
  it("picks only from the enabled operations and eventually uses each", () => {
    const enabled: MathOperation[] = ["addition", "division"];
    const seen = new Set<MathOperation>();
    for (const question of sample(SAMPLES, () => generateQuestionForOperations(enabled, 2))) {
      seen.add(question.operation);
      expect(question.difficulty).toBe(2);
    }
    expect([...seen].sort()).toEqual(["addition", "division"]);
  });

  it("uses the only enabled operation", () => {
    for (const question of sample(50, () => generateQuestionForOperations(["subtraction"], 1))) {
      expect(question.operation).toBe("subtraction");
    }
  });

  it("selects the operation with Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(generateQuestionForOperations([...MATH_OPERATIONS], 1).operation).toBe("division");
  });

  it("passes options through", () => {
    const questions = sample(SAMPLES, () =>
      generateQuestionForOperations(["subtraction"], 4, { allowNegativeSubtraction: true }),
    );
    expect(questions.some((question) => question.correctAnswer < 0)).toBe(true);
  });

  it("throws a clear error for an empty list", () => {
    expect(() => generateQuestionForOperations([], 1)).toThrow(/at least one operation/);
  });
});
