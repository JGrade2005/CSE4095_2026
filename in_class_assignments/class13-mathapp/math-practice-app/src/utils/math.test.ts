import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateAnswer, formatQuestionText, pickRandom, randomInt } from "./math";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("randomInt", () => {
  it("stays inside its inclusive bounds and hits both ends over 10,000 draws", () => {
    const seen = new Set<number>();
    for (let draw = 0; draw < 10_000; draw++) {
      const value = randomInt(3, 7);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
      seen.add(value);
    }
    expect(seen.has(3)).toBe(true);
    expect(seen.has(7)).toBe(true);
    expect(seen.size).toBe(5);
  });

  it("returns that value when min equals max", () => {
    for (let draw = 0; draw < 100; draw++) {
      expect(randomInt(4, 4)).toBe(4);
    }
  });

  it("maps the extremes of Math.random to min and max", () => {
    const random = vi.spyOn(Math, "random");
    random.mockReturnValue(0);
    expect(randomInt(2, 9)).toBe(2);
    random.mockReturnValue(0.999999);
    expect(randomInt(2, 9)).toBe(9);
  });

  it("handles negative ranges", () => {
    for (let draw = 0; draw < 500; draw++) {
      const value = randomInt(-3, -1);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThanOrEqual(-1);
    }
  });

  it("throws when min is greater than max", () => {
    expect(() => randomInt(5, 4)).toThrow(RangeError);
  });
});

describe("pickRandom", () => {
  it("returns an item from the list and eventually every item", () => {
    const items = ["a", "b", "c"];
    const seen = new Set<string>();
    for (let draw = 0; draw < 500; draw++) {
      seen.add(pickRandom(items));
    }
    expect([...seen].sort()).toEqual(items);
  });

  it("uses Math.random so tests can control the choice", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(pickRandom(["a", "b", "c"])).toBe("c");
  });

  it("throws on an empty list", () => {
    expect(() => pickRandom([])).toThrow("empty");
  });
});

describe("calculateAnswer", () => {
  it("computes each operation", () => {
    expect(calculateAnswer("addition", 7, 5)).toBe(12);
    expect(calculateAnswer("subtraction", 7, 5)).toBe(2);
    expect(calculateAnswer("subtraction", 5, 7)).toBe(-2);
    expect(calculateAnswer("multiplication", 7, 8)).toBe(56);
    expect(calculateAnswer("division", 56, 7)).toBe(8);
  });

  it("gives a non-finite result when dividing by zero", () => {
    expect(Number.isFinite(calculateAnswer("division", 5, 0))).toBe(false);
  });
});

describe("formatQuestionText", () => {
  it("uses the proper symbols for each operation", () => {
    expect(formatQuestionText("addition", 3, 4)).toBe("3 + 4 = ?");
    expect(formatQuestionText("subtraction", 9, 4)).toBe("9 − 4 = ?");
    expect(formatQuestionText("multiplication", 7, 8)).toBe("7 × 8 = ?");
    expect(formatQuestionText("division", 56, 7)).toBe("56 ÷ 7 = ?");
  });
});
