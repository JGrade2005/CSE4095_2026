import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./storageKeys";
import {
  clearAllAppData,
  clearCategory,
  getStorageStatus,
  readCategory,
  resetStorageServiceState,
  writeCategory,
} from "./storageService";

const asNumbers = (raw: unknown): number[] => (Array.isArray(raw) ? (raw as number[]) : []);
const emptyList = (): number[] => [];

function denyStorage(method: "getItem" | "setItem") {
  return vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });
}

describe("storageService", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageServiceState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("reading and writing", () => {
    it("returns the fallback with status missing for an absent key", () => {
      const result = readCategory(STORAGE_KEYS.sessions, asNumbers, () => [9]);
      expect(result).toEqual({ value: [9], status: "missing" });
    });

    it("returns the same data after a write", () => {
      expect(writeCategory(STORAGE_KEYS.sessions, [1, 2, 3])).toEqual({ ok: true });
      const result = readCategory(STORAGE_KEYS.sessions, asNumbers, emptyList);
      expect(result).toEqual({ value: [1, 2, 3], status: "ok" });
    });

    it("runs the validator on every read", () => {
      const validate = vi.fn(asNumbers);
      writeCategory(STORAGE_KEYS.sessions, [1]);
      readCategory(STORAGE_KEYS.sessions, validate, emptyList);
      readCategory(STORAGE_KEYS.sessions, validate, emptyList);
      expect(validate).toHaveBeenCalledTimes(2);
    });

    it("repairs stored data the validator changed and reports invalid", () => {
      localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([1, "x", 2]));
      const keepNumbers = (raw: unknown) => asNumbers(raw).filter((n) => typeof n === "number");
      const result = readCategory(STORAGE_KEYS.sessions, keepNumbers, emptyList);
      expect(result).toEqual({ value: [1, 2], status: "invalid" });
      expect(localStorage.getItem(STORAGE_KEYS.sessions)).toBe("[1,2]");
    });

    it("treats valid data saved with a different key order as ok", () => {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ b: 2, a: 1 }));
      const rebuild = (raw: unknown) => {
        const { a, b } = raw as { a: number; b: number };
        return { a, b };
      };
      const result = readCategory(STORAGE_KEYS.settings, rebuild, () => ({ a: 0, b: 0 }));
      expect(result.status).toBe("ok");
    });

    it("uses the fallback when the validator throws", () => {
      writeCategory(STORAGE_KEYS.sessions, [1]);
      const result = readCategory(
        STORAGE_KEYS.sessions,
        () => {
          throw new Error("bad");
        },
        () => [0],
      );
      expect(result).toEqual({ value: [0], status: "invalid" });
    });
  });

  describe("invalid JSON", () => {
    it("resets only the broken key and leaves the others alone", () => {
      localStorage.setItem(STORAGE_KEYS.sessions, "{not json");
      writeCategory(STORAGE_KEYS.attempts, [7]);

      const result = readCategory(STORAGE_KEYS.sessions, asNumbers, () => [5]);

      expect(result).toEqual({ value: [5], status: "invalid" });
      expect(localStorage.getItem(STORAGE_KEYS.sessions)).toBe("[5]");
      expect(localStorage.getItem(STORAGE_KEYS.attempts)).toBe("[7]");
    });
  });

  describe("unavailable storage", () => {
    it("returns defaults and reports unavailable when getItem throws", () => {
      denyStorage("getItem");
      const result = readCategory(STORAGE_KEYS.settings, asNumbers, () => [1]);
      expect(result).toEqual({ value: [1], status: "unavailable" });
      expect(getStorageStatus().available).toBe(false);
    });

    it("keeps the current session working from memory", () => {
      denyStorage("getItem");
      denyStorage("setItem");

      const write = writeCategory(STORAGE_KEYS.attempts, [4, 5]);
      const read = readCategory(STORAGE_KEYS.attempts, asNumbers, emptyList);

      expect(write).toEqual({ ok: false, error: "unavailable" });
      expect(read).toEqual({ value: [4, 5], status: "ok" });
    });

    it("reports unavailable when setItem throws a security error", () => {
      denyStorage("setItem");
      expect(writeCategory(STORAGE_KEYS.settings, [1])).toEqual({
        ok: false,
        error: "unavailable",
      });
      expect(getStorageStatus().available).toBe(false);
    });
  });

  describe("quota errors", () => {
    it("returns a quota failure result without throwing", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
      expect(writeCategory(STORAGE_KEYS.attempts, [1])).toEqual({ ok: false, error: "quota" });
      expect(getStorageStatus().quotaExceeded).toBe(true);
    });

    it("still serves the newest value from memory after a quota failure", () => {
      writeCategory(STORAGE_KEYS.attempts, [1]);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
      writeCategory(STORAGE_KEYS.attempts, [1, 2]);
      expect(readCategory(STORAGE_KEYS.attempts, asNumbers, emptyList).value).toEqual([1, 2]);
    });

    it("reports unknown for a non-DOM error", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("odd");
      });
      expect(writeCategory(STORAGE_KEYS.attempts, [1])).toEqual({ ok: false, error: "unknown" });
    });

    it("reports unknown for a value that cannot be serialized", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(writeCategory(STORAGE_KEYS.attempts, circular)).toEqual({
        ok: false,
        error: "unknown",
      });
    });
  });

  describe("clearing", () => {
    beforeEach(() => {
      localStorage.setItem("otherApp.theme", "dark");
      localStorage.setItem("unprefixed", "1");
      writeCategory(STORAGE_KEYS.settings, [1]);
      writeCategory(STORAGE_KEYS.sessions, [2]);
    });

    it("clearCategory removes only the named key", () => {
      clearCategory(STORAGE_KEYS.settings);
      expect(localStorage.getItem(STORAGE_KEYS.settings)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.sessions)).toBe("[2]");
      expect(localStorage.getItem("otherApp.theme")).toBe("dark");
    });

    it("clearAllAppData removes every mathPractice key and nothing else", () => {
      localStorage.setItem("mathPractice.extraFutureKey", "x");
      clearAllAppData();
      expect(localStorage.getItem(STORAGE_KEYS.settings)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.sessions)).toBeNull();
      expect(localStorage.getItem("mathPractice.extraFutureKey")).toBeNull();
      expect(localStorage.getItem("otherApp.theme")).toBe("dark");
      expect(localStorage.getItem("unprefixed")).toBe("1");
    });

    it("never touches keys without the prefix on read or write", () => {
      writeCategory(STORAGE_KEYS.version, { version: 1 });
      readCategory(STORAGE_KEYS.version, asNumbers, emptyList);
      expect(localStorage.getItem("otherApp.theme")).toBe("dark");
      expect(localStorage.getItem("unprefixed")).toBe("1");
    });

    it("clears memory-only values too", () => {
      denyStorage("getItem");
      denyStorage("setItem");
      writeCategory(STORAGE_KEYS.attempts, [1]);
      clearAllAppData();
      expect(readCategory(STORAGE_KEYS.attempts, asNumbers, emptyList).value).toEqual([]);
    });
  });
});
