import { describe, expect, it } from "vitest";
import { createId } from "./ids";

describe("createId", () => {
  it("creates 10,000 unique ids", () => {
    const ids = new Set<string>();
    for (let count = 0; count < 10_000; count++) {
      ids.add(createId());
    }
    expect(ids.size).toBe(10_000);
  });

  it("creates non-empty string ids", () => {
    const id = createId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
