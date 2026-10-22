import { STORAGE_KEYS, STORAGE_PREFIX } from "./storageKeys";
import type { StorageKey } from "./storageKeys";

export type ReadStatus = "ok" | "missing" | "invalid" | "unavailable";
export type ReadResult<T> = { value: T; status: ReadStatus };
export type WriteError = "unavailable" | "quota" | "unknown";
export type WriteResult = { ok: true } | { ok: false; error: WriteError };
export type StorageStatus = { available: boolean; quotaExceeded: boolean };

// Spec 11: when the browser refuses storage, the current session keeps working from memory.
const memoryStore = new Map<string, string>();
// Keys whose latest value lives only in memory because a write to localStorage failed.
const memoryOnlyKeys = new Set<string>();
let useMemoryOnly = false;
let status: StorageStatus = { available: true, quotaExceeded: false };
const statusListeners = new Set<() => void>();

export function getStorageStatus(): StorageStatus {
  return { ...status };
}

// `status` is only ever replaced, never mutated, so this stays referentially stable between changes.
export function getStorageStatusSnapshot(): StorageStatus {
  return status;
}

export function subscribeStorageStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function setStatus(next: StorageStatus): void {
  if (next.available === status.available && next.quotaExceeded === status.quotaExceeded) return;
  status = next;
  statusListeners.forEach((listener) => listener());
}

export function resetStorageServiceState(): void {
  memoryStore.clear();
  memoryOnlyKeys.clear();
  useMemoryOnly = false;
  setStatus({ available: true, quotaExceeded: false });
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function markUnavailable(): void {
  useMemoryOnly = true;
  setStatus({ ...status, available: false });
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22)
  );
}

type RawRead = { raw: string | null; available: boolean };

function readRaw(key: string): RawRead {
  if (useMemoryOnly || memoryOnlyKeys.has(key)) {
    return { raw: memoryStore.get(key) ?? null, available: !useMemoryOnly };
  }
  const storage = getLocalStorage();
  if (!storage) {
    markUnavailable();
    return { raw: null, available: false };
  }
  try {
    return { raw: storage.getItem(key), available: true };
  } catch {
    markUnavailable();
    return { raw: null, available: false };
  }
}

function writeRaw(key: string, raw: string): WriteResult {
  const storage = useMemoryOnly ? null : getLocalStorage();
  if (!storage) {
    markUnavailable();
    memoryStore.set(key, raw);
    return { ok: false, error: "unavailable" };
  }
  try {
    storage.setItem(key, raw);
    memoryOnlyKeys.delete(key);
    memoryStore.delete(key);
    return { ok: true };
  } catch (error) {
    memoryStore.set(key, raw);
    memoryOnlyKeys.add(key);
    return failedWrite(error);
  }
}

function failedWrite(error: unknown): WriteResult {
  if (isQuotaError(error)) {
    setStatus({ ...status, quotaExceeded: true });
    return { ok: false, error: "quota" };
  }
  if (error instanceof DOMException) {
    setStatus({ ...status, available: false });
    return { ok: false, error: "unavailable" };
  }
  return { ok: false, error: "unknown" };
}

export function writeCategory(key: StorageKey, value: unknown): WriteResult {
  let raw: string | undefined;
  try {
    raw = JSON.stringify(value);
  } catch {
    return { ok: false, error: "unknown" };
  }
  if (raw === undefined) return { ok: false, error: "unknown" };
  return writeRaw(key, raw);
}

function parseJson(raw: string): { ok: true; data: unknown } | { ok: false } {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

export function readCategory<T>(
  key: StorageKey,
  validate: (raw: unknown) => T,
  fallback: () => T,
): ReadResult<T> {
  const read = readRaw(key);
  if (read.raw === null) {
    return { value: fallback(), status: read.available ? "missing" : "unavailable" };
  }

  const parsed = parseJson(read.raw);
  if (!parsed.ok) return repairKey(key, fallback());

  let value: T;
  try {
    value = validate(parsed.data);
  } catch {
    return repairKey(key, fallback());
  }
  // Re-serializing exposes any field or entry the validator had to repair or drop.
  if (stableStringify(value) !== stableStringify(parsed.data)) return repairKey(key, value);
  return { value, status: "ok" };
}

// Sorting object keys keeps valid data saved with a different field order from being "repaired".
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, nested: unknown) => {
    if (nested === null || typeof nested !== "object" || Array.isArray(nested)) return nested;
    const entries = Object.entries(nested as Record<string, unknown>);
    return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
  });
}

function repairKey<T>(key: StorageKey, value: T): ReadResult<T> {
  writeCategory(key, value);
  return { value, status: "invalid" };
}

export function clearCategory(key: StorageKey): void {
  removeKeys([key]);
}

function listAppKeys(storage: Storage | null): string[] {
  const keys = new Set<string>(Object.values(STORAGE_KEYS));
  if (storage) {
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(STORAGE_PREFIX)) keys.add(key);
      }
    } catch {
      // Falling back to the known keys is enough when enumeration fails.
    }
  }
  return [...keys];
}

function removeKeys(keys: string[]): void {
  const storage = getLocalStorage();
  for (const key of keys) {
    memoryStore.delete(key);
    memoryOnlyKeys.delete(key);
    try {
      storage?.removeItem(key);
    } catch {
      // Memory is already cleared; nothing more can be done for a blocked store.
    }
  }
}

export function clearAllAppData(): void {
  removeKeys(listAppKeys(getLocalStorage()));
}

// Approximates browser quota accounting: localStorage stores UTF-16, so two bytes per character.
export function getStorageUsageBytes(): number {
  const storage = getLocalStorage();
  let total = 0;
  for (const key of listAppKeys(storage)) {
    const { raw } = readRaw(key);
    if (raw !== null) total += (key.length + raw.length) * 2;
  }
  return total;
}
