import { afterEach, describe, expect, it, vi } from "vitest";
import { DIFFICULTY_LEVELS, MATH_OPERATIONS } from "../types/question";
import type { DifficultyLevel, MathOperation, Question } from "../types/question";
import type { MistakePattern } from "../types/mistake";
import { calculateAnswer } from "../utils/math";
import { validateQuestion } from "../utils/validation";
import { generateSimilarQuestion } from "./similarQuestionGenerator";

vi.mock("../utils/validation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/validation")>();
  return { ...actual, validateQuestion: vi.fn(actual.validateQuestion) };
});

const { validateQuestion: actualValidateQuestion } =
  await vi.importActual<typeof import("../utils/validation")>("../utils/validation");

const SAMPLES = 200;

function makePattern(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  difficulty: DifficultyLevel,
): MistakePattern {
  return {
    id: "pattern-1",
    operation,
    firstOperand,
    secondOperand,
    correctAnswer: calculateAnswer(operation, firstOperand, secondOperand),
    difficulty,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: "2026-01-01T00:00:00.000Z",
    mastered: false,
  };
}

function generateMany(pattern: MistakePattern, count = SAMPLES, options = {}): Question[] {
  return Array.from({ length: count }, () => generateSimilarQuestion(pattern, options));
}

function textsFor(pattern: MistakePattern, count = SAMPLES): Set<string> {
  return new Set(generateMany(pattern, count).map((question) => question.displayText));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(validateQuestion).mockImplementation(actualValidateQuestion);
});

describe("generateSimilarQuestion basics", () => {
  const patterns: [string, MistakePattern][] = [
    ["addition", makePattern("addition", 8, 7, 2)],
    ["subtraction", makePattern("subtraction", 15, 8, 2)],
    ["multiplication", makePattern("multiplication", 8, 7, 3)],
    ["division", makePattern("division", 56, 7, 3)],
  ];

  it.each(patterns)("returns a valid mistake-review question for %s", (_name, pattern) => {
    for (const question of generateMany(pattern)) {
      expect(actualValidateQuestion(question)).toEqual({ valid: true });
      expect(question.source).toBe("mistake-review");
      expect(question.mistakePatternId).toBe(pattern.id);
      expect(question.difficulty).toBe(pattern.difficulty);
      expect(question.id).toBeTruthy();
    }
  });

  it("stays valid for every operation and level with small and large operands", () => {
    for (const operation of MATH_OPERATIONS) {
      for (const level of DIFFICULTY_LEVELS) {
        const operandSets: [number, number][] = [
          [operation === "division" ? 0 : 10, operation === "division" ? 1 : 10],
          operation === "division" ? [20, 2] : [10, 2],
          operation === "multiplication" ? [10, 5] : [20, 10],
        ];
        for (const [first, second] of operandSets) {
          const pattern = makePattern(operation, first, second, level);
          for (const question of generateMany(pattern, 30)) {
            expect(question.mistakePatternId).toBe(pattern.id);
            expect(question.difficulty).toBe(level);
            expect(question.choices).toHaveLength(4);
          }
        }
      }
    }
  });

  it("passes the negative-subtraction option through at level 4", () => {
    const pattern = makePattern("subtraction", 12, 11, 4);
    const questions = generateMany(pattern, 400, { allowNegativeSubtraction: true });
    for (const question of questions) {
      expect(actualValidateQuestion(question, { allowNegativeSubtraction: true }).valid).toBe(true);
    }
    expect(questions.some((question) => question.correctAnswer < 0)).toBe(true);
    for (const question of generateMany(pattern, 100)) {
      expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("nearby numbers", () => {
  it("produces multiplication neighbors like 8 x 6 and 9 x 7", () => {
    const texts = textsFor(makePattern("multiplication", 8, 7, 3));
    expect(texts.has("8 × 6 = ?")).toBe(true);
    expect(texts.has("9 × 7 = ?")).toBe(true);
  });

  it("changes only one operand by 1 or 2", () => {
    const pattern = makePattern("addition", 20, 30, 3);
    const allowed = new Set([
      "18 + 30 = ?",
      "19 + 30 = ?",
      "21 + 30 = ?",
      "22 + 30 = ?",
      "20 + 28 = ?",
      "20 + 29 = ?",
      "20 + 31 = ?",
      "20 + 32 = ?",
      "30 + 20 = ?",
      "50 − 20 = ?",
      "50 − 30 = ?",
    ]);
    for (const text of textsFor(pattern)) {
      expect(allowed.has(text)).toBe(true);
    }
  });

  it("stays inside the level range at the edges of every level", () => {
    const edges: [MathOperation, number, number, DifficultyLevel][] = [
      ["addition", 10, 10, 1],
      ["addition", 0, 0, 1],
      ["subtraction", 10, 10, 1],
      ["subtraction", 0, 0, 1],
      ["multiplication", 5, 5, 1],
      ["multiplication", 0, 0, 1],
      ["division", 25, 5, 1],
      ["multiplication", 10, 10, 2],
      ["addition", 50, 50, 2],
      ["division", 100, 10, 2],
      ["division", 144, 12, 3],
      ["multiplication", 9, 99, 3],
      ["addition", 100, 100, 3],
      ["addition", 999, 999, 4],
      ["subtraction", 10, 10, 4],
      ["multiplication", 99, 99, 4],
      ["division", 1000, 20, 4],
    ];
    for (const [operation, first, second, level] of edges) {
      for (const question of generateMany(makePattern(operation, first, second, level), 60)) {
        expect(actualValidateQuestion(question).valid).toBe(true);
      }
    }
  });

  it("avoids invalid subtraction: no negative answers and first operand not smaller", () => {
    for (const question of generateMany(makePattern("subtraction", 5, 5, 1))) {
      if (question.operation === "subtraction") {
        expect(question.firstOperand).toBeGreaterThanOrEqual(question.secondOperand);
      }
      expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });

  it("avoids invalid division: no zero divisor and whole-number answers", () => {
    for (const question of generateMany(makePattern("division", 0, 1, 1))) {
      if (question.operation === "division") {
        expect(question.secondOperand).not.toBe(0);
        expect(question.firstOperand % question.secondOperand).toBe(0);
      }
      expect(Number.isInteger(question.correctAnswer)).toBe(true);
    }
  });

  it("keeps division neighbors whole by changing divisor or quotient", () => {
    const texts = textsFor(makePattern("division", 56, 7, 3), 400);
    expect(texts.has("48 ÷ 8 = ?")).toBe(false);
    expect(texts.has("63 ÷ 7 = ?")).toBe(true);
    expect(texts.has("48 ÷ 6 = ?")).toBe(true);
  });

  it("returns the exact original question in under 20% of 50 calls", () => {
    for (const pattern of [
      makePattern("addition", 8, 7, 2),
      makePattern("subtraction", 15, 8, 2),
      makePattern("multiplication", 8, 7, 3),
      makePattern("division", 56, 7, 3),
      makePattern("addition", 5, 5, 1),
      makePattern("multiplication", 5, 5, 1),
    ]) {
      const repeats = generateMany(pattern, 50).filter(
        (question) =>
          question.operation === pattern.operation &&
          question.firstOperand === pattern.firstOperand &&
          question.secondOperand === pattern.secondOperand,
      );
      expect(repeats.length / 50).toBeLessThan(0.2);
    }
  });
});

describe("reversed operands", () => {
  it("reverses addition and multiplication", () => {
    expect(textsFor(makePattern("addition", 8, 3, 2)).has("3 + 8 = ?")).toBe(true);
    expect(textsFor(makePattern("multiplication", 8, 7, 3)).has("7 × 8 = ?")).toBe(true);
  });

  it("never reverses subtraction, even when a reversed form would be allowed", () => {
    const options = { allowNegativeSubtraction: true };
    const questions = generateMany(makePattern("subtraction", 500, 200, 4), 400, options);
    expect(
      questions.some(
        (question) =>
          question.operation === "subtraction" &&
          question.firstOperand === 200 &&
          question.secondOperand === 500,
      ),
    ).toBe(false);
  });

  it("never reverses division", () => {
    const questions = generateMany(makePattern("division", 56, 7, 3), 400);
    expect(
      questions.some(
        (question) =>
          question.operation === "division" &&
          question.firstOperand === 7 &&
          question.secondOperand === 56,
      ),
    ).toBe(false);
  });

  it("skips the reversed form when it equals the original", () => {
    for (const question of generateMany(makePattern("addition", 6, 6, 2))) {
      expect(`${question.firstOperand} ${question.operation} ${question.secondOperand}`).not.toBe(
        "6 addition 6",
      );
    }
  });
});

describe("fact families", () => {
  it("turns a multiplication mistake into division with the product", () => {
    const texts = textsFor(makePattern("multiplication", 8, 7, 3), 400);
    expect(texts.has("56 ÷ 7 = ?")).toBe(true);
    expect(texts.has("56 ÷ 8 = ?")).toBe(true);
  });

  it("turns a division mistake into multiplication", () => {
    const texts = textsFor(makePattern("division", 56, 7, 3), 400);
    expect(texts.has("7 × 8 = ?")).toBe(true);
    expect(texts.has("8 × 7 = ?")).toBe(true);
  });

  it("turns an addition mistake into subtraction", () => {
    const texts = textsFor(makePattern("addition", 8, 7, 2), 400);
    expect(texts.has("15 − 8 = ?")).toBe(true);
    expect(texts.has("15 − 7 = ?")).toBe(true);
  });

  it("turns a subtraction mistake into addition", () => {
    const texts = textsFor(makePattern("subtraction", 15, 8, 2), 400);
    expect(texts.has("7 + 8 = ?")).toBe(true);
    expect(texts.has("8 + 7 = ?")).toBe(true);
  });

  it("skips the inverse operation when it is not among the allowed operations", () => {
    const additionOnly = generateMany(makePattern("addition", 8, 7, 2), 400, {
      allowedOperations: ["addition"],
    });
    const multiplicationOnly = generateMany(makePattern("multiplication", 8, 7, 3), 400, {
      allowedOperations: ["multiplication"],
    });
    expect(additionOnly.every((question) => question.operation === "addition")).toBe(true);
    expect(multiplicationOnly.every((question) => question.operation === "multiplication")).toBe(
      true,
    );
  });

  it("still uses the inverse operation when it is allowed", () => {
    const questions = generateMany(makePattern("addition", 8, 7, 2), 400, {
      allowedOperations: ["addition", "subtraction"],
    });
    expect(questions.some((question) => question.operation === "subtraction")).toBe(true);
  });

  it("drops fact-family questions that fall outside the level", () => {
    const questions = generateMany(makePattern("multiplication", 7, 45, 3), 200);
    for (const question of questions) {
      expect(actualValidateQuestion(question).valid).toBe(true);
      expect(question.operation).not.toBe("division");
    }
  });

  it("never divides by zero when a multiplication mistake has a zero factor", () => {
    for (const question of generateMany(makePattern("multiplication", 0, 4, 1))) {
      if (question.operation === "division") {
        expect(question.secondOperand).not.toBe(0);
      }
      expect(actualValidateQuestion(question).valid).toBe(true);
    }
  });
});

describe("fallbacks", () => {
  it("falls back to the original question when nothing else validates", () => {
    const pattern = makePattern("multiplication", 8, 7, 3);
    vi.mocked(validateQuestion).mockImplementation((question, options) =>
      question.firstOperand === 8 && question.secondOperand === 7
        ? actualValidateQuestion(question, options)
        : { valid: false, reason: "blocked" },
    );
    const question = generateSimilarQuestion(pattern);
    expect([question.firstOperand, question.secondOperand]).toEqual([8, 7]);
    expect(question.source).toBe("mistake-review");
    expect(question.mistakePatternId).toBe(pattern.id);
  });

  it("falls back to a generated question labelled as mistake review", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(validateQuestion).mockReturnValue({ valid: false, reason: "blocked" });
    const pattern = makePattern("division", 56, 7, 3);
    const question = generateSimilarQuestion(pattern);
    expect(question.operation).toBe("division");
    expect(question.difficulty).toBe(3);
    expect(question.source).toBe("mistake-review");
    expect(question.mistakePatternId).toBe(pattern.id);
    expect(actualValidateQuestion({ ...question }).valid).toBe(true);
  });

  it("does not throw for a malformed pattern with a fractional division", () => {
    const pattern = makePattern("division", 7, 2, 3);
    expect(() => generateMany(pattern, 50)).not.toThrow();
  });
});
