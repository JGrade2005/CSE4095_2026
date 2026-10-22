import { beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "./migrations";
import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS } from "./storageKeys";
import { resetStorageServiceState } from "./storageService";

describe("runMigrations", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageServiceState();
  });

  it("migrates data with no version and writes version 1", () => {
    localStorage.setItem(STORAGE_KEYS.settings, '{"keep":"me"}');

    const result = runMigrations();

    expect(result).toEqual({ from: 0, to: CURRENT_SCHEMA_VERSION });
    expect(localStorage.getItem(STORAGE_KEYS.version)).toBe('{"version":1}');
    expect(localStorage.getItem(STORAGE_KEYS.settings)).toBe('{"keep":"me"}');
  });

  it("treats an unreadable version as 0", () => {
    localStorage.setItem(STORAGE_KEYS.version, "garbage");
    expect(runMigrations().from).toBe(0);
    expect(localStorage.getItem(STORAGE_KEYS.version)).toBe('{"version":1}');
  });

  it("runs the step for an older version", () => {
    localStorage.setItem(STORAGE_KEYS.version, '{"version":0}');
    expect(runMigrations()).toEqual({ from: 0, to: 1 });
    expect(localStorage.getItem(STORAGE_KEYS.version)).toBe('{"version":1}');
  });

  it("leaves data already at the current version unchanged", () => {
    localStorage.setItem(STORAGE_KEYS.version, '{"version": 1}');
    expect(runMigrations()).toEqual({ from: 1, to: 1 });
    expect(localStorage.getItem(STORAGE_KEYS.version)).toBe('{"version": 1}');
  });

  it("leaves a newer version alone", () => {
    localStorage.setItem(STORAGE_KEYS.version, '{"version":7}');
    expect(runMigrations()).toEqual({ from: 7, to: 7 });
    expect(localStorage.getItem(STORAGE_KEYS.version)).toBe('{"version":7}');
  });

  it("does not delete unrelated stored data", () => {
    localStorage.setItem("otherApp.theme", "dark");
    localStorage.setItem(STORAGE_KEYS.attempts, "[]");
    runMigrations();
    expect(localStorage.getItem("otherApp.theme")).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEYS.attempts)).toBe("[]");
  });
});
