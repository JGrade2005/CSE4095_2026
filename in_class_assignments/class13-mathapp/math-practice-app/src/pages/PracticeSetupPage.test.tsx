import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createDefaultSettings } from "../services/defaults";
import { saveSettings } from "../services/practiceRecords";
import { renderRoute } from "../test/renderRoute";

const SETTINGS_KEY = "mathPractice.settings";

beforeEach(() => {
  localStorage.clear();
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

  it("goes to the practice page with the chosen config", async () => {
    const { router } = renderRoute("/practice/setup");
    await userEvent.click(screen.getByRole("checkbox", { name: /Subtraction/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Advanced/ }));
    await userEvent.click(screen.getByRole("radio", { name: "20 questions" }));
    await userEvent.click(screen.getByRole("button", { name: "Start Session" }));

    expect(router.state.location.pathname).toBe("/practice/session");
    expect(router.state.location.state).toEqual({
      config: {
        operations: ["addition", "subtraction"],
        difficulty: 4,
        sessionLength: 20,
        mode: "regular",
      },
    });
    expect(screen.getByText(/Ready to practice: Addition, Subtraction,/)).toHaveTextContent(
      "Level 4: Advanced, 20 questions",
    );
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

  it("shows a set-up prompt when the practice page is opened without a session", async () => {
    const { router } = renderRoute("/practice/session");
    expect(screen.getByText("No practice session has been set up yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Set Up Practice" }));
    expect(router.state.location.pathname).toBe("/practice/setup");
  });
});
