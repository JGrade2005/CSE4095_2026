import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createDefaultSettings } from "../services/defaults";
import { loadSettings, saveSettings } from "../services/practiceRecords";
import type { AppSettings } from "../types/settings";
import { SettingsContext } from "./settingsContext";

export default function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // The ref lets updateSettings keep one identity, so consumers of the callback never re-render for it.
  const settingsRef = useRef(settings);

  const applySettings = useCallback((next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);

  const updateSettings = useCallback(
    (changes: Partial<AppSettings>) => applySettings({ ...settingsRef.current, ...changes }),
    [applySettings],
  );

  const resetSettings = useCallback(() => applySettings(createDefaultSettings()), [applySettings]);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
}
