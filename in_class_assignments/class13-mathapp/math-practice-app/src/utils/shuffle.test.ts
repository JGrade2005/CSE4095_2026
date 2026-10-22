import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("returns the same items in some order", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect([...shuffle(items)].sort()).toEqual(items);
  });

  it("does not change the input array and returns a new one", () => {
    const items = [1, 2, 3, 4];
    const result = shuffle(items);
    expect(items).toEqual([1, 2, 3, 4]);
    expect(result).not.toBe(items);
  });

  it("handles empty and single-item arrays", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([9])).toEqual([9]);
  });

  it("puts the first item in each position 15 to 35% of the time over 4,000 runs", () => {
    const runs = 4000;
    const counts = [0, 0, 0, 0];
    for (let run = 0; run < runs; run++) {
      counts[shuffle(["first", "b", "c", "d"]).indexOf("first")]++;
    }
    for (const count of counts) {
      expect(count / runs).toBeGreaterThanOrEqual(0.15);
      expect(count / runs).toBeLessThanOrEqual(0.35);
    }
  });
});
