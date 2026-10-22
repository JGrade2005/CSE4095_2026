import { afterEach, describe, expect, it, vi } from "vitest";
import { MATH_OPERATIONS } from "../types/question";
import type { MathOperation } from "../types/question";
import { calculateAnswer, randomInt } from "../utils/math";
import { buildChoices, CHOICE_COUNT } from "./distractors";
import type { ChoiceParts } from "./distractors";

afterEach(() => {
  vi.restoreAllMocks();
});

function partsFor(operation: MathOperation, firstOperand: number, secondOperand: number) {
  return {
    operation,
    firstOperand,
    secondOperand,
    correctAnswer: calculateAnswer(operation, firstOperand, secondOperand),
  };
}

function firstOperandFor(operation: MathOperation, first: number, second: number): number {
  if (operation === "division") return first * second;
  if (operation === "subtraction") return first + second;
  return first;
}

function expectValidChoices(parts: ChoiceParts, choices: number[], allowNegative = false) {
  expect(choices).toHaveLength(CHOICE_COUNT);
  expect(new Set(choices).size).toBe(CHOICE_COUNT);
  expect(choices.filter((choice) => choice === parts.correctAnswer)).toHaveLength(1);
  for (const choice of choices) {
    expect(Number.isInteger(choice)).toBe(true);
    if (!allowNegative) {
      expect(choice).toBeGreaterThanOrEqual(0);
    }
  }
}

describe("buildChoices", () => {
  it("always finishes, even for a negative answer when negatives are not allowed", () => {
    const parts: ChoiceParts = {
      operation: "multiplication",
      firstOperand: -2,
      secondOperand: 7,
      correctAnswer: -14,
    };
    const choices = buildChoices(parts, { allowNegative: false });
    expect(new Set(choices).size).toBe(CHOICE_COUNT);
    expect(choices.filter((choice) => choice === -14)).toHaveLength(1);
    expect(choices.filter((choice) => choice !== -14).every((choice) => choice >= 0)).toBe(true);
  });

  it("returns exactly 4 unique integers containing the correct answer once", () => {
    for (const operation of MATH_OPERATIONS) {
      for (let sample = 0; sample < 300; sample++) {
        const first = randomInt(1, 12);
        const second = randomInt(1, 12);
        const parts = partsFor(operation, firstOperandFor(operation, first, second), second);
        expectValidChoices(parts, buildChoices(parts));
      }
    }
  });

  it("keeps wrong choices plausible, within max(10, 50% of the answer)", () => {
    for (let sample = 0; sample < 300; sample++) {
      const parts = partsFor("multiplication", randomInt(10, 99), randomInt(10, 99));
      const allowed = Math.max(10, parts.correctAnswer * 0.5);
      for (const choice of buildChoices(parts)) {
        expect(Math.abs(choice - parts.correctAnswer)).toBeLessThanOrEqual(allowed);
      }
    }
  });

  it("includes multiplication neighbor facts when the pool allows", () => {
    const parts = partsFor("multiplication", 8, 7);
    const neighbors = new Set([63, 49, 64, 48]);
    for (let sample = 0; sample < 100; sample++) {
      const wrong = buildChoices(parts).filter((choice) => choice !== 56);
      expect(wrong.every((choice) => neighbors.has(choice))).toBe(true);
    }
  });

  it("offers the a + b mistake for subtraction and the divisor for division", () => {
    const subtractionPick = new Set<number>();
    const divisionPick = new Set<number>();
    for (let sample = 0; sample < 400; sample++) {
      buildChoices(partsFor("subtraction", 90, 8)).forEach((choice) => subtractionPick.add(choice));
      buildChoices(partsFor("division", 56, 7)).forEach((choice) => divisionPick.add(choice));
    }
    expect(subtractionPick.has(98)).toBe(true);
    expect(divisionPick.has(7)).toBe(true);
  });

  it("offers carrying-mistake choices (+/-10) for addition", () => {
    const seen = new Set<number>();
    for (let sample = 0; sample < 400; sample++) {
      buildChoices(partsFor("addition", 38, 27)).forEach((choice) => seen.add(choice));
    }
    expect(seen.has(75)).toBe(true);
    expect(seen.has(55)).toBe(true);
  });

  it.each([
    ["addition", 0, 0],
    ["subtraction", 5, 5],
    ["multiplication", 0, 3],
    ["division", 0, 4],
    ["multiplication", 0, 0],
    ["subtraction", 0, 0],
  ] as const)("gives 4 valid non-negative choices for %s %i, %i near zero", (op, first, second) => {
    const parts = partsFor(op, first, second);
    for (let sample = 0; sample < 200; sample++) {
      expectValidChoices(parts, buildChoices(parts));
    }
  });

  it("allows negative choices only when negatives are allowed", () => {
    const parts = partsFor("subtraction", 3, 8);
    let sawNegative = false;
    for (let sample = 0; sample < 200; sample++) {
      const choices = buildChoices(parts, { allowNegative: true });
      expectValidChoices(parts, choices, true);
      sawNegative = sawNegative || choices.some((choice) => choice < 0);
    }
    expect(sawNegative).toBe(true);
  });

  it("returns within the retry limit for degenerate random sources", () => {
    const random = vi.spyOn(Math, "random");
    for (const value of [0, 0.5, 0.999999]) {
      random.mockReturnValue(value);
      for (const operation of MATH_OPERATIONS) {
        const parts = partsFor(operation, 2, 1);
        expectValidChoices(parts, buildChoices(parts));
      }
    }
  });

  it("fills from the nearest valid integers when no strategy applies", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const parts = partsFor("addition", 0, 0);
    expectValidChoices(parts, buildChoices(parts));
  });

  it("rejects a non-integer correct answer instead of looping", () => {
    expect(() => buildChoices({ ...partsFor("division", 7, 2) })).toThrow(RangeError);
    expect(() => buildChoices({ ...partsFor("division", 7, 0) })).toThrow(RangeError);
  });

  it("puts the correct answer in each position 15 to 35% of the time over 2,000 questions", () => {
    const parts = partsFor("multiplication", 8, 7);
    const runs = 2000;
    const counts = [0, 0, 0, 0];
    for (let run = 0; run < runs; run++) {
      counts[buildChoices(parts).indexOf(parts.correctAnswer)]++;
    }
    for (const count of counts) {
      expect(count / runs).toBeGreaterThanOrEqual(0.15);
      expect(count / runs).toBeLessThanOrEqual(0.35);
    }
  });
});
