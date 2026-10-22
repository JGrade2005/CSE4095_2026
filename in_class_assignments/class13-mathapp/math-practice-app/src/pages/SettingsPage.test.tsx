import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createDefaultSettings } from "../services/defaults";
import { saveSession } from "../services/practiceRecords";
import type { AppSettings } from "../types/settings";
import { renderRoute } from "../test/renderRoute";

const SETTINGS_KEY = "mathPractice.settings";

function storedSettings(): AppSettings {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as AppSettings;
}

function appKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.startsWith("mathPractice."));
}

// The Settings route is lazy-loaded, so wait for the page before using it.
async function renderSettings() {
  const view = renderRoute("/settings");
  await screen.findByRole("heading", { level: 1, name: "Settings" }, { timeout: 5000 });
  return view;
}

// Loading the lazy chunk once up front keeps the first test from spending its time budget on it.
beforeAll(async () => {
  await import("./SettingsPage");
});

beforeEach(() => {
  localStorage.clear();
});

describe("SettingsPage", () => {
  it.each([
    ["Sound effects", "soundEffectsEnabled"],
    ["Card flip animation", "cardAnimationEnabled"],
    ["Show explanations", "showExplanations"],
    ["Feedback messages", "feedbackMessagesEnabled"],
    ["Allow negative answers in Advanced subtraction", "allowNegativeSubtraction"],
  ] as const)("saves the %s toggle immediately", async (name, key) => {
    await renderSettings();
    const before = createDefaultSettings()[key];
    const toggle = screen.getByRole("checkbox", { name });
    await userEvent.click(toggle);
    expect(storedSettings()[key]).toBe(!before);
    expect(screen.getByRole("status")).toHaveTextContent("Settings saved");
    await userEvent.click(toggle);
    expect(storedSettings()[key]).toBe(before);
  });

  it("saves the default difficulty and session length", async () => {
    await renderSettings();
    const difficulty = screen.getByRole("group", { name: "Default difficulty" });
    await userEvent.click(within(difficulty).getByRole("radio", { name: /Advanced/ }));
    const length = screen.getByRole("group", { name: "Default session length" });
    await userEvent.click(within(length).getByRole("radio", { name: "Continuous practice" }));
    expect(storedSettings().defaultDifficulty).toBe(4);
    expect(storedSettings().defaultSessionLength).toBe("continuous");
  });

  it("saves default operations in standard order", async () => {
    await renderSettings();
    const group = screen.getByRole("group", { name: "Default operations" });
    await userEvent.click(within(group).getByRole("checkbox", { name: /Division/ }));
    await userEvent.click(within(group).getByRole("checkbox", { name: /Subtraction/ }));
    expect(storedSettings().defaultOperations).toEqual(["addition", "subtraction", "division"]);
  });

  it("saves the mastery threshold", async () => {
    await renderSettings();
    await userEvent.selectOptions(
      screen.getByLabelText("Correct similar answers needed to master a mistake"),
      "5",
    );
    expect(storedSettings().masteryThreshold).toBe(5);
  });

  it("shows a changed default difficulty on the Setup page", async () => {
    const { router } = await renderSettings();
    const difficulty = screen.getByRole("group", { name: "Default difficulty" });
    await userEvent.click(within(difficulty).getByRole("radio", { name: /Intermediate/ }));
    await router.navigate("/practice/setup");
    expect(await screen.findByRole("radio", { name: /Intermediate/ })).toBeChecked();
  });

  it("does not save an empty default operation list", async () => {
    await renderSettings();
    const group = screen.getByRole("group", { name: "Default operations" });
    await userEvent.click(within(group).getByRole("checkbox", { name: /Addition/ }));
    expect(
      screen.getByText("Pick at least one kind of math to save your defaults."),
    ).toBeInTheDocument();
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
    await userEvent.click(within(group).getByRole("checkbox", { name: /Division/ }));
    expect(storedSettings().defaultOperations).toEqual(["division"]);
  });

  it("explains where progress is stored", async () => {
    await renderSettings();
    expect(
      screen.getByText(
        "Your progress is saved only in this browser on this device. Clearing your browser data may erase your progress.",
      ),
    ).toBeInTheDocument();
  });

  describe("Clear All Application Data", () => {
    function seedData() {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ ...createDefaultSettings(), defaultDifficulty: 4 }),
      );
      saveSession({
        id: "s1",
        startedAt: "2026-01-01T00:00:00.000Z",
        operations: ["addition"],
        difficulty: 1,
        sessionLength: 5,
        attempted: 1,
        correct: 1,
        incorrect: 0,
      });
    }

    it("asks for confirmation and keeps everything on Cancel", async () => {
      seedData();
      const { router } = await renderSettings();
      await userEvent.click(screen.getByRole("button", { name: "Clear All Application Data" }));
      const dialog = screen.getByRole("alertdialog", { name: "Erase everything?" });
      expect(dialog).toHaveTextContent(
        "This will erase all settings, practice history, statistics, and mistakes on this device. This cannot be undone.",
      );
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(storedSettings().defaultDifficulty).toBe(4);
      expect(localStorage.getItem("mathPractice.sessions")).not.toBeNull();
      expect(router.state.location.pathname).toBe("/settings");
    });

    it("erases data, restores defaults and returns Home on Confirm", async () => {
      seedData();
      const { router } = await renderSettings();
      await userEvent.click(screen.getByRole("button", { name: "Clear All Application Data" }));
      await userEvent.click(screen.getByRole("button", { name: "Yes, erase everything" }));

      expect(router.state.location.pathname).toBe("/");
      expect(
        await screen.findByRole("heading", { level: 1, name: "Welcome to Math Practice!" }),
      ).toBeInTheDocument();
      expect(localStorage.getItem("mathPractice.sessions")).toBeNull();
      expect(storedSettings()).toEqual(createDefaultSettings());
      expect(appKeys().sort()).toEqual(["mathPractice.settings", "mathPractice.version"]);

      await router.navigate("/practice/setup");
      expect(await screen.findByRole("radio", { name: /Beginner/ })).toBeChecked();
    });
  });
});
