import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useSettings } from "../hooks/useSettings";
import { createDefaultSettings } from "../services/defaults";
import { saveSettings } from "../services/practiceRecords";
import SettingsProvider from "./SettingsProvider";

const SETTINGS_KEY = "mathPractice.settings";

function wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("useSettings", () => {
  it("throws a clear error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSettings())).toThrow(
      "useSettings must be used inside a SettingsProvider.",
    );
    vi.restoreAllMocks();
  });

  it("loads stored settings", () => {
    saveSettings({ ...createDefaultSettings(), defaultDifficulty: 3 });
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.defaultDifficulty).toBe(3);
  });

  it("updateSettings merges changes and persists immediately", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => result.current.updateSettings({ soundEffectsEnabled: false }));
    expect(result.current.settings.soundEffectsEnabled).toBe(false);
    expect(result.current.settings.showExplanations).toBe(true);
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    expect(stored.soundEffectsEnabled).toBe(false);
  });

  it("resetSettings restores and saves the defaults", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => result.current.updateSettings({ defaultDifficulty: 4, masteryThreshold: 7 }));
    act(() => result.current.resetSettings());
    expect(result.current.settings).toEqual(createDefaultSettings());
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}")).toEqual(createDefaultSettings());
  });

  it("shares one state between components", async () => {
    function Reader() {
      const { settings, updateSettings } = useSettings();
      return (
        <button onClick={() => updateSettings({ cardAnimationEnabled: false })}>
          {String(settings.cardAnimationEnabled)}
        </button>
      );
    }
    render(
      <SettingsProvider>
        <Reader />
      </SettingsProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "true" }));
    expect(screen.getByRole("button", { name: "false" })).toBeInTheDocument();
  });
});
