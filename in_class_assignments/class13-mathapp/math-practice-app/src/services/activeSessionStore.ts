import type { PracticeState } from "../types/practice";
import { STORAGE_KEYS } from "./storageKeys";
import { clearCategory, readCategory, writeCategory } from "./storageService";
import type { WriteResult } from "./storageService";
import { validateActiveSession } from "./storageValidators";

export function saveActiveSession(state: PracticeState): WriteResult {
  return writeCategory(STORAGE_KEYS.activeSession, state);
}

export function clearActiveSession(): void {
  clearCategory(STORAGE_KEYS.activeSession);
}

export function loadActiveSession(): PracticeState | null {
  const { value, status } = readCategory(
    STORAGE_KEYS.activeSession,
    validateActiveSession,
    () => null,
  );
  // A rejected value is repaired to the string "null"; remove the key instead.
  if (status === "invalid") clearActiveSession();
  return value;
}
