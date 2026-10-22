import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createDefaultSettings } from "../services/defaults";
import { loadSessions, saveSettings } from "../services/practiceRecords";
import { resetStorageServiceState } from "../services/storageService";
import { renderRoute } from "../test/renderRoute";

const SETTINGS_KEY = "mathPractice.settings";

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
});

describe("PracticeSetupPage", () => {
  it("starts from the stored defaults", () => {
    saveSettings({
      ...createDefaultSettings(),
      defaultOperations: ["multiplication", "division"],
      defaultDifficulty: 3,
      defaultSessionLength: "continuous",
    });
    renderRoute("/practice/setup");
    expect(screen.getByRole("checkbox", { name: /Multiplication/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Division/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Addition/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Intermediate/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Continuous practice" })).toBeChecked();
  });

  it("disables Start Session and explains why when no operation is selected", async () => {
    renderRoute("/practice/setup");
    const start = screen.getByRole("button", { name: "Start Session" });
    expect(start).toBeEnabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /Addition/ }));
    expect(start).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pick at least one kind of math to start.",
    );
  });

  it("enables Start Session again once an operation is picked", async () => {
    renderRoute("/practice/setup");
    await userEvent.click(screen.getByRole("checkbox", { name: /Addition/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Subtraction/ }));
    expect(screen.getByRole("button", { name: "Start Session" })).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("starts a session with the chosen config and opens the practice page", async () => {
    const { router } = renderRoute("/practice/setup");
    await userEvent.click(screen.getByRole("checkbox", { name: /Subtraction/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Advanced/ }));
    await userEvent.click(screen.getByRole("radio", { name: "20 questions" }));
    await userEvent.click(screen.getByRole("button", { name: "Start Session" }));

    expect(router.state.location.pathname).toBe("/practice/session");
    expect(router.state.location.state).toBeNull();
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "20");

    const [session] = loadSessions();
    expect(session).toMatchObject({
      operations: ["addition", "subtraction"],
      difficulty: 4,
      sessionLength: 20,
      attempted: 0,
    });
  });

  it("does not change the saved defaults when options change for one session", async () => {
    saveSettings(createDefaultSettings());
    const before = localStorage.getItem(SETTINGS_KEY);
    renderRoute("/practice/setup");
    await userEvent.click(screen.getByRole("checkbox", { name: /Division/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Easy/ }));
    await userEvent.click(screen.getByRole("radio", { name: "5 questions" }));
    expect(localStorage.getItem(SETTINGS_KEY)).toBe(before);
  });

  it("tells the user when the practice page is opened without a session", () => {
    renderRoute("/practice/session");
    expect(
      screen.getByRole("heading", { name: "No practice session is running." }),
    ).toBeInTheDocument();
  });
});
