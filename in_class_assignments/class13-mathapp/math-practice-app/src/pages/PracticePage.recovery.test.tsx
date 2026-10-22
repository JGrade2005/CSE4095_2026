import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadActiveSession } from "../services/activeSessionStore";
import { loadAttempts } from "../services/practiceRecords";
import { STORAGE_KEYS } from "../services/storageKeys";
import {
  advanceToNextQuestion,
  answerAndAdvance,
  pickFirstChoiceAndFlip,
  recordResult,
  resetAppStorage,
  startFromSetup,
  useFakeTimers,
  useRealTimers,
} from "../test/practiceTestUtils";
import { renderRoute } from "../test/renderRoute";

vi.setConfig({ testTimeout: 15000 });

beforeEach(() => {
  useFakeTimers();
  resetAppStorage();
});

afterEach(() => {
  useRealTimers();
});

// A refresh keeps localStorage but throws away all React state.
function refreshOnPracticePage(unmount: () => void) {
  unmount();
  return renderRoute("/practice/session");
}

function startSession() {
  const view = renderRoute("/practice/setup");
  startFromSetup();
  return view;
}

describe("PracticePage session recovery", () => {
  it("saves the session while it is active", () => {
    startSession();
    const saved = loadActiveSession();
    expect(saved?.status).toBe("active");
    expect(saved?.session?.sessionLength).toBe(5);
  });

  it("resumes at the same question after a refresh", () => {
    const { unmount } = startSession();
    const question = loadActiveSession()!.currentQuestion!;

    const { router } = refreshOnPracticePage(unmount);

    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    expect(screen.getAllByText(question.displayText).length).toBeGreaterThan(0);
    const choices = within(screen.getByRole("group", { name: "Answer choices" }));
    expect(choices.getAllByRole("button").map((button) => button.textContent)).toEqual(
      question.choices.map((choice) => expect.stringContaining(String(choice))),
    );
  });

  it("keeps the selected answer", () => {
    const { unmount } = startSession();
    const question = loadActiveSession()!.currentQuestion!;
    const choices = within(screen.getByRole("group", { name: "Answer choices" }));
    fireEvent.click(choices.getAllByRole("button")[2]);
    expect(loadActiveSession()!.selectedAnswer).toBe(question.choices[2]);

    refreshOnPracticePage(unmount);

    const restored = within(screen.getByRole("group", { name: "Answer choices" }));
    const pressed = restored.getAllByRole("button").filter((b) => b.ariaPressed === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent(String(question.choices[2]));
  });

  it("keeps the flipped card", () => {
    const { unmount } = startSession();
    pickFirstChoiceAndFlip();
    expect(loadActiveSession()!.isCardFlipped).toBe(true);

    refreshOnPracticePage(unmount);

    expect(screen.getByRole("heading", { name: "Here is the answer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I Got It Right" })).toBeEnabled();
  });

  it("does not record an answer twice when the refresh comes after recording", () => {
    const { unmount } = startSession();
    pickFirstChoiceAndFlip();
    recordResult(false);
    expect(loadAttempts()).toHaveLength(1);

    refreshOnPracticePage(unmount);
    expect(screen.getByRole("button", { name: "I Got It Right" })).toBeDisabled();
    advanceToNextQuestion();

    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
    expect(loadAttempts()).toHaveLength(1);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("keeps counting after the refresh and clears the saved session when it finishes", () => {
    const { unmount } = startSession();
    answerAndAdvance(true);
    answerAndAdvance(false);

    const { router } = refreshOnPracticePage(unmount);
    expect(screen.getByText("Question 3 of 5")).toBeInTheDocument();
    for (let i = 0; i < 3; i++) answerAndAdvance(true);

    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    expect(screen.getByText("Questions attempted").nextElementSibling).toHaveTextContent("5");
    expect(loadAttempts()).toHaveLength(5);
  });

  it("clears the saved session when a continuous session is ended", async () => {
    resetAppStorage({ defaultSessionLength: "continuous" });
    const user = userEvent.setup({ delay: null });
    startSession();
    answerAndAdvance(true);
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "End Session" }));
    await user.click(screen.getByRole("button", { name: "Yes, finish" }));

    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
  });

  it("shows the empty state, not a crash, when the saved session is corrupted", () => {
    const { unmount } = startSession();
    unmount();
    localStorage.setItem(STORAGE_KEYS.activeSession, '{"status":"active","currentQuestion":5}');

    renderRoute("/practice/session");

    expect(
      screen.getByRole("heading", { name: "No practice session is running." }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
  });
});
