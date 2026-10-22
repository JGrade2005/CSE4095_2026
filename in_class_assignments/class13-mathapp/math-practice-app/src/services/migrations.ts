import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS } from "./storageKeys";
import { readCategory, writeCategory } from "./storageService";
import { validateVersionRecord } from "./storageValidators";

type MigrationStep = () => void;

// Key n holds the step that upgrades stored data from version n to n + 1.
// A step may only reshape app-owned keys; it must never delete unrelated data.
const MIGRATIONS: Record<number, MigrationStep> = {
  0: () => {},
};

export type MigrationResult = { from: number; to: number };

export function readStoredVersion(): number {
  return readCategory(STORAGE_KEYS.version, validateVersionRecord, () => ({ version: 0 })).value
    .version;
}

function writeVersion(version: number): void {
  writeCategory(STORAGE_KEYS.version, { version });
}

export function runMigrations(): MigrationResult {
  const from = readStoredVersion();
  let version = from;
  while (version < CURRENT_SCHEMA_VERSION) {
    MIGRATIONS[version]?.();
    version += 1;
    writeVersion(version);
  }
  return { from, to: version };
}
