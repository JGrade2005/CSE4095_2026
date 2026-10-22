import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createDefaultSettings } from "../services/defaults";
import { loadSettings, saveSettings } from "../services/practiceRecords";
import type { AppSettings } from "../types/settings";
import { SettingsContext } from "./settingsContext";

export default function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback(
    (changes: Partial<AppSettings>) => {
      const next = { ...settings, ...changes };
      setSettings(next);
      saveSettings(next);
    },
    [settings],
  );

  const resetSettings = useCallback(() => {
    const defaults = createDefaultSettings();
    setSettings(defaults);
    saveSettings(defaults);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
}
