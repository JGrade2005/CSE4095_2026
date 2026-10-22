import { render, screen } from "@testing-library/react";
import { makeActiveState } from "../test/activeSessionFixtures";
import { initializeStorage } from "../services/practiceRecords";
import { STORAGE_KEYS } from "../services/storageKeys";
import { resetStorageServiceState } from "../services/storageService";
import { seedStorage } from "../test/statisticsTestData";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
  seedStorage();
  localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(makeActiveState()));
});

describe("App with corrupted stored data", () => {
  it.each([
    STORAGE_KEYS.settings,
    STORAGE_KEYS.attempts,
    STORAGE_KEYS.sessions,
    STORAGE_KEYS.mistakePatterns,
    STORAGE_KEYS.statistics,
    STORAGE_KEYS.activeSession,
    STORAGE_KEYS.version,
  ])("still shows the home page when %s is garbage", (key) => {
    localStorage.setItem(key, "garbage {{{");
    initializeStorage();

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to Math Practice!" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Oops/)).not.toBeInTheDocument();
  });

  it("still shows the home page when the app starts without the startup repair step", () => {
    for (const key of Object.values(STORAGE_KEYS)) localStorage.setItem(key, "garbage {{{");
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to Math Practice!" }),
    ).toBeInTheDocument();
  });
});
