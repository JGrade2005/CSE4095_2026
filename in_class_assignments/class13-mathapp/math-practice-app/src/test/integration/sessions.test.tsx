import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadActiveSession } from "../../services/activeSessionStore";
import {
  loadAttempts,
  loadMistakePatterns,
  loadSessions,
  loadSettings,
  loadStatistics,
} from "../../services/practiceRecords";
import {
  advanceToNextQuestion,
  answerAndAdvance,
  answerQuestion,
  resetAppStorage,
  seedAdditionMistake,
  startFromSetup,
  useFakeTimers,
  useRealTimers,
} from "../practiceTestUtils";
import { renderRoute } from "../renderRoute";
import {
  answerAll,
  chooseOperationsMixed,
  chooseSessionLength,
  currentQuestion,
  goTo,
  summaryValue,
  warmLazyRoutes,
} from "../integrationUtils";

// Full sessions are many renders; the default 5s is tight when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 15000 });

beforeAll(warmLazyRoutes);

beforeEach(() => {
  useFakeTimers();
  resetAppStorage();
});

afterEach(() => {
  useRealTimers();
});

describe("a full addition session", () => {
  it("runs five questions and ends on the summary with the right totals", () => {
    const { router } = renderRoute("/practice/setup");
    startFromSetup();

    const results = [true, true, false, true, false];
    results.forEach((correct, index) => {
      expect(screen.getByText(`Question ${index + 1} of 5`)).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(index));
      answerQuestion(correct);
      if (index < results.length - 1) {
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(index + 1));
      }
      advanceToNextQuestion();
    });

    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(
      screen.getByRole("heading", { level: 1, name: "Session complete!" }),
    ).toBeInTheDocument();
    expect(summaryValue("Questions attempted")).toBe("5");
    expect(summaryValue("Correct")).toBe("3");
    expect(summaryValue("Incorrect")).toBe("2");
    expect(summaryValue("Accuracy")).toBe("60%");
    expect(summaryValue("Operations practiced")).toBe("Addition");
    expect(summaryValue("Session length")).toBe("5 questions");
    expect(summaryValue("Mistake-review questions")).toBe("0");

    expect(loadStatistics()).toMatchObject({
      attempted: 5,
      correct: 3,
      incorrect: 2,
      byOperation: { addition: { attempted: 5, correct: 3, incorrect: 2 } },
    });
    expect(loadAttempts()).toHaveLength(5);
    const [session] = loadSessions();
    expect(session).toMatchObject({ attempted: 5, correct: 3, incorrect: 2 });
    expect(session.completedAt).toBeDefined();
    expect(loadActiveSession()).toBeNull();
  });
});

describe("a mixed-operation session", () => {
  it("records attempts for more than one operation over 20 questions", () => {
    const { router } = renderRoute("/practice/setup");
    chooseOperationsMixed();
    chooseSessionLength("20 questions");
    startFromSetup();

    answerAll(Array.from({ length: 20 }, () => true));

    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(summaryValue("Questions attempted")).toBe("20");
    expect(summaryValue("Operations practiced")).toBe(
      "Addition, Subtraction, Multiplication, Division",
    );
    const attempts = loadAttempts();
    expect(attempts).toHaveLength(20);
    const operations = new Set(attempts.map((attempt) => attempt.operation));
    expect(operations.size).toBeGreaterThan(1);

    const { byOperation, attempted } = loadStatistics();
    const perOperation = Object.values(byOperation).map((counts) => counts.attempted);
    expect(perOperation.reduce((sum, count) => sum + count, 0)).toBe(20);
    expect(perOperation.filter((count) => count > 0).length).toBeGreaterThan(1);
    expect(attempted).toBe(20);
  });
});

describe("continuous practice", () => {
  it("keeps going until End Session, then reports the number answered", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");
    chooseSessionLength("Continuous practice");
    startFromSetup();

    expect(screen.getByText("Questions answered: 0")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    answerAll([true, false, true]);
    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Questions answered: 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "End Session" }));
    const dialog = screen.getByRole("alertdialog", { name: "End this session?" });
    expect(dialog).toHaveTextContent("You answered 3 questions.");
    await user.click(within(dialog).getByRole("button", { name: "Yes, finish" }));

    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(summaryValue("Questions attempted")).toBe("3");
    expect(summaryValue("Correct")).toBe("2");
    expect(summaryValue("Session length")).toBe("Continuous practice");
    expect(loadSessions()[0]).toMatchObject({ attempted: 3, sessionLength: "continuous" });
    expect(loadSessions()[0].completedAt).toBeDefined();
  });
});

describe("mastery", () => {
  it("masters a pattern after three correct review answers and then disables review", async () => {
    seedAdditionMistake({ incorrectCount: 2, similarCorrectCount: 0 });
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");

    expect(screen.getByText("You have 1 mistake to review for these choices.")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Practice my mistakes" }));
    startFromSetup();

    for (let answered = 1; answered <= 3; answered++) {
      expect(currentQuestion()).toMatchObject({
        source: "mistake-review",
        mistakePatternId: "seeded-pattern",
      });
      answerAndAdvance(true);
      const [pattern] = loadMistakePatterns();
      expect(pattern).toMatchObject({
        similarCorrectCount: answered,
        mastered: answered === 3,
        incorrectCount: 2,
      });
    }

    answerAll([true, true]);
    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(summaryValue("Mistake-review questions")).toBe("3");
    expect(screen.getByRole("button", { name: "Practice Mistakes" })).toBeDisabled();
    expect(screen.getByText("No mistakes to review for these choices yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change Settings" }));
    expect(screen.getByRole("radio", { name: "Practice my mistakes" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Regular practice" })).toBeChecked();

    await goTo(router, "/statistics");
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    expect(screen.getByText("Mastered patterns").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Active mistake patterns").nextElementSibling).toHaveTextContent("0");
  });
});

describe("persistence after a refresh", () => {
  it("resumes an in-progress session and keeps what was already recorded", () => {
    const first = renderRoute("/practice/setup");
    startFromSetup();
    answerAll([true, false, true]);
    const question = currentQuestion();
    const statsBefore = loadStatistics();
    first.unmount();

    const { router } = renderRoute("/practice/session");

    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Question 4 of 5")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getAllByText(question.displayText).length).toBeGreaterThan(0);
    expect(loadStatistics()).toEqual(statsBefore);

    answerAll([true, true]);
    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(summaryValue("Questions attempted")).toBe("5");
    expect(summaryValue("Correct")).toBe("4");
    expect(loadSessions()).toHaveLength(1);
    expect(loadAttempts()).toHaveLength(5);
  });

  it("keeps statistics, sessions and mistake patterns after the app is reopened", async () => {
    const first = renderRoute("/practice/setup");
    startFromSetup();
    answerAll([true, false, true, true, true]);
    first.unmount();
    expect(loadActiveSession()).toBeNull();

    renderRoute("/statistics");
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    const overall = within(screen.getByRole("region", { name: "Overall results" }));
    expect(overall.getByText("Questions attempted").nextElementSibling).toHaveTextContent("5");
    expect(overall.getByText("Accuracy").nextElementSibling).toHaveTextContent("80%");
    const sessions = screen.getByRole("table", { name: "Your most recent practice sessions" });
    expect(within(sessions).getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Active mistake patterns").nextElementSibling).toHaveTextContent("1");
    expect(loadSessions()).toHaveLength(1);
    expect(loadMistakePatterns()).toHaveLength(1);
  });
});

describe("Reset Statistics", () => {
  it("clears history and mistakes but keeps the settings", async () => {
    resetAppStorage({ masteryThreshold: 4, defaultDifficulty: 2, showExplanations: false });
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");
    startFromSetup();
    answerAll([false, true, true, true, true]);
    expect(loadMistakePatterns()).toHaveLength(1);

    await goTo(router, "/statistics");
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    await user.click(screen.getByRole("button", { name: "Reset Statistics" }));
    await user.click(screen.getByRole("button", { name: "Yes, erase my history" }));

    expect(screen.getByRole("heading", { name: "No practice yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No sessions yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No mistakes yet" })).toBeInTheDocument();
    expect(loadAttempts()).toEqual([]);
    expect(loadSessions()).toEqual([]);
    expect(loadMistakePatterns()).toEqual([]);
    expect(loadStatistics()).toMatchObject({ attempted: 0, correct: 0, incorrect: 0 });
    expect(loadSettings()).toMatchObject({
      masteryThreshold: 4,
      defaultDifficulty: 2,
      showExplanations: false,
      defaultSessionLength: 5,
    });

    await goTo(router, "/practice/setup");
    expect(screen.getByRole("radio", { name: "Practice my mistakes" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Easy/ })).toBeChecked();
  });
});
