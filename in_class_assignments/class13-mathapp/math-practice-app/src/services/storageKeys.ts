export const STORAGE_PREFIX = "mathPractice.";

export const STORAGE_KEYS = {
  settings: "mathPractice.settings",
  sessions: "mathPractice.sessions",
  attempts: "mathPractice.attempts",
  mistakePatterns: "mathPractice.mistakePatterns",
  statistics: "mathPractice.statistics",
  version: "mathPractice.version",
  activeSession: "mathPractice.activeSession",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const CURRENT_SCHEMA_VERSION = 1;
