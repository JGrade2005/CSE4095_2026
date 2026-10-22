import { createDefaultSettings, createEmptyStatistics } from "./defaults";
import { runMigrations } from "./migrations";
import { STORAGE_KEYS } from "./storageKeys";
import { getStorageStatus, readCategory, writeCategory } from "./storageService";
import type { StorageStatus, WriteResult } from "./storageService";
import {
  validateAttempts,
  validateMistakePatterns,
  validateSessions,
  validateSettings,
  validateStatistics,
} from "./storageValidators";
import type { MistakePattern } from "../types/mistake";
import type { PracticeAttempt, PracticeSession } from "../types/session";
import type { AppSettings } from "../types/settings";
import type { AppStatistics } from "../types/statistics";

export const MAX_STORED_SESSIONS = 50;
export const MAX_STORED_ATTEMPTS = 2000;

export function loadSettings(): AppSettings {
  return readCategory(STORAGE_KEYS.settings, validateSettings, createDefaultSettings).value;
}

export function saveSettings(settings: AppSettings): WriteResult {
  return writeCategory(STORAGE_KEYS.settings, settings);
}

export function loadSessions(): PracticeSession[] {
  return readCategory(STORAGE_KEYS.sessions, validateSessions, () => []).value;
}

function sortNewestFirst(sessions: PracticeSession[]): PracticeSession[] {
  return [...sessions].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function loadRecentSessions(limit: number): PracticeSession[] {
  return sortNewestFirst(loadSessions()).slice(0, Math.max(0, limit));
}

function upsertById(sessions: PracticeSession[], session: PracticeSession): PracticeSession[] {
  const exists = sessions.some((stored) => stored.id === session.id);
  if (!exists) return [...sessions, session];
  return sessions.map((stored) => (stored.id === session.id ? session : stored));
}

export function saveSession(session: PracticeSession): WriteResult {
  const updated = upsertById(loadSessions(), session);
  const kept = sortNewestFirst(updated).slice(0, MAX_STORED_SESSIONS);
  return writeCategory(STORAGE_KEYS.sessions, kept);
}

export function loadAttempts(): PracticeAttempt[] {
  return readCategory(STORAGE_KEYS.attempts, validateAttempts, () => []).value;
}

export function appendAttempt(attempt: PracticeAttempt): WriteResult {
  const updated = [...loadAttempts(), attempt].slice(-MAX_STORED_ATTEMPTS);
  return writeCategory(STORAGE_KEYS.attempts, updated);
}

// Totals live in their own key so trimming old sessions and attempts never changes them.
export function loadStatistics(): AppStatistics {
  return readCategory(STORAGE_KEYS.statistics, validateStatistics, createEmptyStatistics).value;
}

export function saveStatistics(statistics: AppStatistics): WriteResult {
  return writeCategory(STORAGE_KEYS.statistics, statistics);
}

export function loadMistakePatterns(): MistakePattern[] {
  return readCategory(STORAGE_KEYS.mistakePatterns, validateMistakePatterns, () => []).value;
}

export function saveMistakePatterns(patterns: MistakePattern[]): WriteResult {
  return writeCategory(STORAGE_KEYS.mistakePatterns, patterns);
}

// Reading every category once repairs invalid stored data before the UI relies on it.
export function initializeStorage(): StorageStatus {
  runMigrations();
  loadSettings();
  loadSessions();
  loadAttempts();
  loadStatistics();
  loadMistakePatterns();
  return getStorageStatus();
}
