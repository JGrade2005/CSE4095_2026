import { useContext } from "react";
import { SettingsContext } from "../app/settingsContext";

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside a SettingsProvider.");
  }
  return context;
}
