import { useSyncExternalStore } from "react";
import { getStorageStatusSnapshot, subscribeStorageStatus } from "../services/storageService";
import type { StorageStatus } from "../services/storageService";

export function useStorageStatus(): StorageStatus {
  return useSyncExternalStore(subscribeStorageStatus, getStorageStatusSnapshot);
}
