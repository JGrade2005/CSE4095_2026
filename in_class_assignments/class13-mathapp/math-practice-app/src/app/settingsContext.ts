import { createContext } from "react";
import type { AppSettings } from "../types/settings";

export interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (changes: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
