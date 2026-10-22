import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadAttempts } from "../services/practiceRecords";
import { renderRoute } from "../test/renderRoute";
import { NEXT_QUESTION_DELAY_MS, NEXT_QUESTION_FAST_DELAY_MS } from "./PracticePage";
import {
  advanceToNextQuestion,
  answerAndAdvance,
  answerQuestion,
  pickFirstChoiceAndFlip,
  recordResult,
  resetAppStorage,
  startFromSetup,
  useFakeTimers,
  useRealTimers,
} from "../test/practiceTestUtils";

// Full sessions are many renders; the default 5s is tight when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 15000 });

let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  useFakeTimers();
  user = userEvent.setup({ delay: null });
  resetAppStorage();
});

afterEach(() => {
  useRealTimers();
});

describe("PracticePage", () => {
  it("redirects to setup when no session has been started", () => {
    const { router } = renderRoute("/practice/session");
    expect(router.state.location.pathname).toBe("/practice/setup");
    expect(screen.getByRole("heading", { level: 1, name: "Practice Setup" })).toBeInTheDocument();
  });

  it("shows question 1 of 5 with a progress bar after starting from setup", async () => {
    const { router } = renderRoute("/practice/setup");
    startFromSetup();

    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByRole("heading", { level: 1, name: "Practice" })).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
  });

  it("records one attempt, then shows the next question with updated progress", async () => {
    renderRoute("/practice/setup");
    startFromSetup();

    pickFirstChoiceAndFlip();
    expect(screen.getByRole("heading", { name: "Here is the answer" })).toBeInTheDocument();
    recordResult(true);

    expect(loadAttempts()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "I Got It Right" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "I Got It Wrong" })).toBeDisabled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");

    advanceToNextQuestion();
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flip Card" })).toBeDisabled();
    expect(loadAttempts()).toHaveLength(1);
  });

  it("waits for the transition delay before moving on", async () => {
    renderRoute("/practice/setup");
    startFromSetup();
    answerQuestion(true);

    act(() => {
      vi.advanceTimersByTime(NEXT_QUESTION_FAST_DELAY_MS - 1);
    });
    expect(screen.getByRole("heading", { name: "Here is the answer" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
  });

  it("uses the longer transition when card animation is on", async () => {
    resetAppStorage({ cardAnimationEnabled: true });
    renderRoute("/practice/setup");
    startFromSetup();
    answerQuestion(true);

    act(() => {
      vi.advanceTimersByTime(NEXT_QUESTION_FAST_DELAY_MS);
    });
    expect(screen.getByRole("heading", { name: "Here is the answer" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(NEXT_QUESTION_DELAY_MS - NEXT_QUESTION_FAST_DELAY_MS);
    });
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
  });

  it("hides the explanation when the setting is off", async () => {
    resetAppStorage({ showExplanations: false });
    renderRoute("/practice/setup");
    startFromSetup();
    pickFirstChoiceAndFlip();
    expect(screen.queryByText(/count up/)).not.toBeInTheDocument();
  });

  it("goes to the summary after the last question", async () => {
    const { router } = renderRoute("/practice/setup");
    startFromSetup();
    for (let i = 0; i < 4; i++) answerAndAdvance(true);
    expect(screen.getByText("Question 5 of 5")).toBeInTheDocument();

    answerQuestion(false);

    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(
      screen.getByRole("heading", { level: 1, name: "Session complete!" }),
    ).toBeInTheDocument();
    expect(loadAttempts()).toHaveLength(5);
  });

  describe("continuous practice", () => {
    beforeEach(() => {
      resetAppStorage({ defaultSessionLength: "continuous" });
    });

    it("shows no progress bar but counts answered questions", async () => {
      renderRoute("/practice/setup");
      startFromSetup();

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.getByText("Questions answered: 0")).toBeInTheDocument();
      expect(screen.getByText("Question 1")).toBeInTheDocument();

      answerAndAdvance(true);
      expect(screen.getByText("Questions answered: 1")).toBeInTheDocument();
      expect(screen.getByText("Question 2")).toBeInTheDocument();
    });

    it("asks before ending and keeps practicing when cancelled", async () => {
      const { router } = renderRoute("/practice/setup");
      startFromSetup();
      answerAndAdvance(true);

      await user.click(screen.getByRole("button", { name: "End Session" }));
      const dialog = screen.getByRole("alertdialog", { name: "End this session?" });
      expect(dialog).toHaveTextContent("You answered 1 question.");

      await user.click(screen.getByRole("button", { name: "Keep practicing" }));
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/practice/session");
      expect(screen.getByText("Question 2")).toBeInTheDocument();
    });

    it("finishes and shows the summary when confirmed", async () => {
      const { router } = renderRoute("/practice/setup");
      startFromSetup();
      answerAndAdvance(true);
      answerAndAdvance(false);

      await user.click(screen.getByRole("button", { name: "End Session" }));
      await user.click(screen.getByRole("button", { name: "Yes, finish" }));

      expect(router.state.location.pathname).toBe("/practice/summary");
      expect(screen.getByText("Questions attempted").nextElementSibling).toHaveTextContent("2");
    });
  });

  it("does not offer End Session in a fixed-length session", async () => {
    renderRoute("/practice/setup");
    startFromSetup();
    expect(screen.queryByRole("button", { name: "End Session" })).not.toBeInTheDocument();
  });

  it("returns to the summary when a finished session's practice page is opened again", async () => {
    const { router } = renderRoute("/practice/setup");
    startFromSetup();
    for (let i = 0; i < 5; i++) answerAndAdvance(true);
    expect(router.state.location.pathname).toBe("/practice/summary");

    await act(() => router.navigate("/practice/session"));
    expect(router.state.location.pathname).toBe("/practice/summary");
  });
});
