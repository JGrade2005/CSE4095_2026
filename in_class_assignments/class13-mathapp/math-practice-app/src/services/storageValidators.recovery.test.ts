import { beforeEach, describe, expect, it } from "vitest";
import {
  SEED_ATTEMPTS,
  SEED_PATTERNS,
  SEED_SESSIONS,
  SEED_SETTINGS,
  SEED_STATISTICS,
  seedStorage,
} from "../test/statisticsTestData";
import { makeActiveState } from "../test/activeSessionFixtures";
import { loadActiveSession } from "./activeSessionStore";
import { createDefaultSettings, createEmptyStatistics } from "./defaults";
import {
  initializeStorage,
  loadAttempts,
  loadMistakePatterns,
  loadSessions,
  loadSettings,
  loadStatistics,
} from "./practiceRecords";
import { STORAGE_KEYS } from "./storageKeys";
import type { StorageKey } from "./storageKeys";
import { resetStorageServiceState } from "./storageService";

const DATA_KEYS = [
  STORAGE_KEYS.settings,
  STORAGE_KEYS.attempts,
  STORAGE_KEYS.sessions,
  STORAGE_KEYS.mistakePatterns,
  STORAGE_KEYS.statistics,
  STORAGE_KEYS.activeSession,
] as const;

function snapshot(keys: readonly StorageKey[]): Record<string, string | null> {
  return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
}

function seedEverything() {
  seedStorage();
  localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(makeActiveState()));
}

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
});

describe("storage recovery", () => {
  it.each(DATA_KEYS)("resets only %s when it holds unreadable text", (corruptKey) => {
    seedEverything();
    const others = DATA_KEYS.filter((key) => key !== corruptKey);
    const before = snapshot(others);

    localStorage.setItem(corruptKey, "garbage {{{");
    expect(() => initializeStorage()).not.toThrow();

    expect(snapshot(others)).toEqual(before);
    expect(localStorage.getItem(corruptKey)).not.toBe("garbage {{{");
  });

  it.each(DATA_KEYS)("resets only %s when it holds the wrong kind of data", (corruptKey) => {
    seedEverything();
    const others = DATA_KEYS.filter((key) => key !== corruptKey);
    const before = snapshot(others);

    localStorage.setItem(corruptKey, "12345");
    expect(() => initializeStorage()).not.toThrow();

    expect(snapshot(others)).toEqual(before);
  });

  it("falls back to default settings and keeps statistics", () => {
    seedEverything();
    localStorage.setItem(STORAGE_KEYS.settings, "garbage");
    initializeStorage();
    expect(loadSettings()).toEqual(createDefaultSettings());
    expect(loadStatistics()).toEqual(SEED_STATISTICS);
    expect(loadAttempts()).toEqual(SEED_ATTEMPTS);
  });

  it("repairs individual settings fields without discarding the valid ones", () => {
    seedEverything();
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ ...SEED_SETTINGS, masteryThreshold: 99, soundEffectsEnabled: "loud" }),
    );
    initializeStorage();
    const settings = loadSettings();
    expect(settings.masteryThreshold).toBe(createDefaultSettings().masteryThreshold);
    expect(settings.soundEffectsEnabled).toBe(createDefaultSettings().soundEffectsEnabled);
    expect(settings.defaultDifficulty).toBe(SEED_SETTINGS.defaultDifficulty);
  });

  it("drops invalid attempts and keeps the valid ones", () => {
    seedEverything();
    localStorage.setItem(
      STORAGE_KEYS.attempts,
      JSON.stringify([...SEED_ATTEMPTS, { id: "broken" }, null, 7]),
    );
    initializeStorage();
    expect(loadAttempts()).toEqual(SEED_ATTEMPTS);
    expect(loadSessions()).toEqual(expect.arrayContaining(SEED_SESSIONS));
  });

  it("drops invalid sessions and keeps the valid ones", () => {
    seedEverything();
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([...SEED_SESSIONS, { id: "x", startedAt: "never" }]),
    );
    initializeStorage();
    expect(loadSessions()).toHaveLength(SEED_SESSIONS.length);
    expect(loadMistakePatterns()).toEqual(SEED_PATTERNS);
  });

  it("drops invalid mistake patterns and keeps the valid ones", () => {
    seedEverything();
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([...SEED_PATTERNS, { id: "p", operation: "power" }]),
    );
    initializeStorage();
    expect(loadMistakePatterns()).toEqual(SEED_PATTERNS);
    expect(loadSessions()).toHaveLength(SEED_SESSIONS.length);
  });

  it("resets corrupted statistics to zero without touching the detailed history", () => {
    seedEverything();
    localStorage.setItem(STORAGE_KEYS.statistics, JSON.stringify({ attempted: "many" }));
    initializeStorage();
    expect(loadStatistics()).toEqual(createEmptyStatistics());
    expect(loadAttempts()).toEqual(SEED_ATTEMPTS);
  });

  it("drops a corrupted active session and keeps everything else", () => {
    seedEverything();
    const before = snapshot(DATA_KEYS.filter((key) => key !== STORAGE_KEYS.activeSession));
    localStorage.setItem(STORAGE_KEYS.activeSession, '{"status":"active"}');
    expect(loadActiveSession()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    expect(snapshot(DATA_KEYS.filter((key) => key !== STORAGE_KEYS.activeSession))).toEqual(before);
  });

  it("starts cleanly from completely empty storage", () => {
    expect(() => initializeStorage()).not.toThrow();
    expect(loadSettings()).toEqual(createDefaultSettings());
    expect(loadAttempts()).toEqual([]);
    expect(loadActiveSession()).toBeNull();
  });
});
