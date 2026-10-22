import { beforeEach, describe, expect, it } from "vitest";
import { findPattern, getPatternKey, recordIncorrectAnswer } from "./mistakeService";
import type { IncorrectAnswerInfo } from "./mistakeService";
import { loadMistakePatterns, saveMistakePatterns } from "./practiceRecords";
import { STORAGE_KEYS } from "./storageKeys";
import { resetStorageServiceState } from "./storageService";
import type { MistakePattern } from "../types/mistake";

const multiplication: IncorrectAnswerInfo = {
  operation: "multiplication",
  firstOperand: 7,
  secondOperand: 8,
  correctAnswer: 56,
  difficulty: 2,
};

const firstTime = new Date("2026-02-01T09:00:00.000Z");
const laterTime = new Date("2026-02-02T09:00:00.000Z");

describe("getPatternKey", () => {
  it("treats reversed addition and multiplication operands as one key", () => {
    expect(getPatternKey("multiplication", 7, 8)).toBe(getPatternKey("multiplication", 8, 7));
    expect(getPatternKey("addition", 3, 4)).toBe(getPatternKey("addition", 4, 3));
  });

  it("keeps order for subtraction and division", () => {
    expect(getPatternKey("subtraction", 9, 4)).not.toBe(getPatternKey("subtraction", 4, 9));
    expect(getPatternKey("division", 12, 3)).not.toBe(getPatternKey("division", 3, 12));
  });

  it("separates operations", () => {
    expect(getPatternKey("addition", 2, 2)).not.toBe(getPatternKey("multiplication", 2, 2));
  });
});

describe("recordIncorrectAnswer", () => {
  it("creates a pattern with every spec field", () => {
    const [pattern] = recordIncorrectAnswer([], multiplication, firstTime);

    expect(pattern).toEqual({
      id: expect.any(String),
      operation: "multiplication",
      firstOperand: 7,
      secondOperand: 8,
      correctAnswer: 56,
      difficulty: 2,
      incorrectCount: 1,
      similarCorrectCount: 0,
      lastIncorrectAt: "2026-02-01T09:00:00.000Z",
      mastered: false,
    });
    expect(pattern.id.length).toBeGreaterThan(0);
  });

  it("uses the current time when none is given", () => {
    const before = Date.now();
    const [pattern] = recordIncorrectAnswer([], multiplication);
    const stamped = Date.parse(pattern.lastIncorrectAt);
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(Date.now());
  });

  it("raises the count and timestamp for a repeated miss without duplicating", () => {
    const first = recordIncorrectAnswer([], multiplication, firstTime);
    const second = recordIncorrectAnswer(first, multiplication, laterTime);

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      id: first[0].id,
      incorrectCount: 2,
      lastIncorrectAt: "2026-02-02T09:00:00.000Z",
    });
  });

  it("counts 7 x 8 and 8 x 7 as the same pattern", () => {
    const first = recordIncorrectAnswer([], multiplication, firstTime);
    const reversed = { ...multiplication, firstOperand: 8, secondOperand: 7 };
    const second = recordIncorrectAnswer(first, reversed, laterTime);

    expect(second).toHaveLength(1);
    expect(second[0].incorrectCount).toBe(2);
    expect([second[0].firstOperand, second[0].secondOperand]).toEqual([7, 8]);
  });

  it("stores addition operands in sorted order", () => {
    const [pattern] = recordIncorrectAnswer(
      [],
      {
        operation: "addition",
        firstOperand: 9,
        secondOperand: 4,
        correctAnswer: 13,
        difficulty: 1,
      },
      firstTime,
    );
    expect([pattern.firstOperand, pattern.secondOperand]).toEqual([4, 9]);
  });

  it("keeps 9 - 4 and 4 - 9 as different patterns", () => {
    const base = { operation: "subtraction", correctAnswer: 5, difficulty: 4 } as const;
    let patterns = recordIncorrectAnswer([], { ...base, firstOperand: 9, secondOperand: 4 });
    patterns = recordIncorrectAnswer(patterns, { ...base, firstOperand: 4, secondOperand: 9 });
    expect(patterns).toHaveLength(2);
  });

  it("makes a mastered pattern active again and resets progress", () => {
    const mastered: MistakePattern = {
      ...recordIncorrectAnswer([], multiplication, firstTime)[0],
      similarCorrectCount: 3,
      mastered: true,
    };

    const [updated] = recordIncorrectAnswer(
      [mastered],
      { ...multiplication, difficulty: 3 },
      laterTime,
    );

    expect(updated).toMatchObject({
      mastered: false,
      similarCorrectCount: 0,
      incorrectCount: 2,
      difficulty: 3,
    });
  });

  it("does not change the input array or its patterns", () => {
    const original = recordIncorrectAnswer([], multiplication, firstTime);
    const snapshot = structuredClone(original);
    const updated = recordIncorrectAnswer(original, multiplication, laterTime);
    expect(original).toEqual(snapshot);
    expect(updated).not.toBe(original);
  });

  it("leaves other patterns untouched", () => {
    const other = recordIncorrectAnswer(
      [],
      { operation: "addition", firstOperand: 1, secondOperand: 2, correctAnswer: 3, difficulty: 1 },
      firstTime,
    );
    const both = recordIncorrectAnswer(other, multiplication, laterTime);
    expect(both).toHaveLength(2);
    expect(both[0]).toBe(other[0]);
  });
});

describe("findPattern", () => {
  it("finds a pattern regardless of operand order for commutative operations", () => {
    const patterns = recordIncorrectAnswer([], multiplication, firstTime);
    expect(findPattern(patterns, "multiplication", 8, 7)).toBe(patterns[0]);
    expect(findPattern(patterns, "addition", 7, 8)).toBeUndefined();
  });
});

describe("mistake pattern persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageServiceState();
  });

  it("survives a save and reload", () => {
    const patterns = recordIncorrectAnswer([], multiplication, firstTime);
    saveMistakePatterns(patterns);
    expect(loadMistakePatterns()).toEqual(patterns);
  });

  it("returns an empty list when nothing is stored", () => {
    expect(loadMistakePatterns()).toEqual([]);
  });

  it("drops invalid stored records and keeps valid ones", () => {
    const [valid] = recordIncorrectAnswer([], multiplication, firstTime);
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([valid, { id: "broken" }, 42]),
    );
    expect(loadMistakePatterns()).toEqual([valid]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns) ?? "")).toEqual([valid]);
  });

  it("recovers from unreadable JSON", () => {
    localStorage.setItem(STORAGE_KEYS.mistakePatterns, "{oops");
    expect(loadMistakePatterns()).toEqual([]);
  });
});
