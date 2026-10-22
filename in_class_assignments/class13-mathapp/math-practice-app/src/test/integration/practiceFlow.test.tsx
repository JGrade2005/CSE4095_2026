import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadActiveSession } from "../../services/activeSessionStore";
import { findPattern } from "../../services/mistakeService";
import { loadAttempts, loadMistakePatterns, loadStatistics } from "../../services/practiceRecords";
import type { Question } from "../../types/question";
import { createId } from "../../utils/ids";
import {
  advanceToNextQuestion,
  answerAndAdvance,
  resetAppStorage,
  seedAdditionMistake,
  startFromSetup,
  useFakeTimers,
  useRealTimers,
} from "../practiceTestUtils";
import { renderRoute } from "../renderRoute";
import { summaryValue, warmLazyRoutes } from "../integrationUtils";

const forced = vi.hoisted(() => ({
  regularFact: null as [number, number] | null,
  reviewFact: null as [number, number] | null,
}));

// Pinning the generated fact makes "miss the same fact again" deterministic.
vi.mock("../../services/questionGenerator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/questionGenerator")>();
  return {
    ...actual,
    generateQuestionForOperations: (
      ...args: Parameters<typeof actual.generateQuestionForOperations>
    ) =>
      forced.regularFact
        ? actual.buildQuestion("addition", forced.regularFact[0], forced.regularFact[1], 1)
        : actual.generateQuestionForOperations(...args),
  };
});

vi.mock("../../services/similarQuestionGenerator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/similarQuestionGenerator")>();
  const questions = await import("../../services/questionGenerator");
  return {
    ...actual,
    generateSimilarQuestion: (
      pattern: Parameters<typeof actual.generateSimilarQuestion>[0],
      ...rest: unknown[]
    ): Question =>
      forced.reviewFact
        ? {
            ...questions.buildQuestion(
              "addition",
              forced.reviewFact[0],
              forced.reviewFact[1],
              1,
              {},
              "mistake-review",
            ),
            id: createId(),
            mistakePatternId: pattern.id,
          }
        : actual.generateSimilarQuestion(pattern, ...(rest as [])),
  };
});

// Full sessions are many renders; the default 5s is tight when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 15000 });

beforeAll(warmLazyRoutes);

beforeEach(() => {
  forced.regularFact = [3, 4];
  forced.reviewFact = null;
  useFakeTimers();
  resetAppStorage();
});

afterEach(() => {
  useRealTimers();
});

function storedQuestion(): Question {
  const question = loadActiveSession()?.currentQuestion;
  if (!question) throw new Error("No active question is stored.");
  return question;
}

async function pickFlipAndMark(user: ReturnType<typeof userEvent.setup>, correct: boolean) {
  const group = screen.getByRole("group", { name: "Answer choices" });
  await user.click(within(group).getAllByRole("button")[0]);
  await user.click(screen.getByRole("button", { name: "Flip Card" }));
  await user.click(
    screen.getByRole("button", { name: correct ? "I Got It Right" : "I Got It Wrong" }),
  );
}

// Spec 21.3, steps 1 to 8.
describe("practice flow", () => {
  it("records a mistake, then offers a similar question in review mode", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");

    // 1. Start a practice session.
    startFromSetup();
    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    expect(screen.getAllByText("3 + 4 = ?").length).toBeGreaterThan(0);

    // 2. Select an answer.
    const group = screen.getByRole("group", { name: "Answer choices" });
    const choice = within(group).getAllByRole("button")[0];
    await user.click(choice);
    expect(choice).toHaveAttribute("aria-pressed", "true");

    // 3. Flip the card.
    await user.click(screen.getByRole("button", { name: "Flip Card" }));
    expect(screen.getByRole("heading", { name: "Here is the answer" })).toBeInTheDocument();

    // 4. Mark the answer incorrect.
    await user.click(screen.getByRole("button", { name: "I Got It Wrong" }));

    // 5. Statistics update.
    expect(loadStatistics()).toMatchObject({
      attempted: 1,
      correct: 0,
      incorrect: 1,
      byOperation: { addition: { attempted: 1, correct: 0, incorrect: 1 } },
      byDifficulty: { 1: { attempted: 1, correct: 0, incorrect: 1 } },
    });

    // 6. A mistake pattern is stored.
    const patterns = loadMistakePatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      operation: "addition",
      firstOperand: 3,
      secondOperand: 4,
      correctAnswer: 7,
      difficulty: 1,
      incorrectCount: 1,
      similarCorrectCount: 0,
      mastered: false,
    });

    advanceToNextQuestion();
    for (let i = 0; i < 4; i++) answerAndAdvance(true);
    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(summaryValue("Incorrect")).toBe("1");

    // 7. Start mistake-review mode.
    await user.click(screen.getByRole("button", { name: "Practice Mistakes" }));
    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();

    // 8. A similar question appears, tied to the stored pattern.
    const question = storedQuestion();
    expect(question.source).toBe("mistake-review");
    expect(question.mistakePatternId).toBe(patterns[0].id);
    expect(question.displayText).not.toBe("3 + 4 = ?");
    expect(question.operation).toBe("addition");
    expect(screen.getAllByText(question.displayText).length).toBeGreaterThan(0);

    answerAndAdvance(true);
    const attempts = loadAttempts();
    expect(attempts).toHaveLength(6);
    expect(attempts[0].source).toBe("regular");
    expect(attempts[0].mistakePatternId).toBeUndefined();
    expect(attempts[5]).toMatchObject({
      source: "mistake-review",
      difficulty: 1,
      mistakePatternId: patterns[0].id,
    });
    expect(loadMistakePatterns()[0].similarCorrectCount).toBe(1);
  });

  it("shows the stored mistake on the Statistics page", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");
    startFromSetup();
    await pickFlipAndMark(user, false);
    advanceToNextQuestion();
    for (let i = 0; i < 4; i++) answerAndAdvance(true);

    await user.click(await screen.findByRole("button", { name: "View Statistics" }));
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    expect(router.state.location.pathname).toBe("/statistics");
    const overall = within(screen.getByRole("region", { name: "Overall results" }));
    expect(overall.getByText("Questions attempted").nextElementSibling).toHaveTextContent("5");
    expect(overall.getByText("Accuracy").nextElementSibling).toHaveTextContent("80%");
    expect(screen.getByText("Active mistake patterns").nextElementSibling).toHaveTextContent("1");
    expect(screen.queryByRole("heading", { name: "No mistakes yet" })).not.toBeInTheDocument();
  });

  it("counts a repeated miss of the same fact on the same pattern", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");

    startFromSetup();
    await pickFlipAndMark(user, false);
    const [first] = loadMistakePatterns();
    expect(first.incorrectCount).toBe(1);

    advanceToNextQuestion();
    for (let i = 0; i < 4; i++) answerAndAdvance(true);
    expect(router.state.location.pathname).toBe("/practice/summary");

    await user.click(screen.getByRole("button", { name: "Practice Again" }));
    expect(screen.getAllByText("3 + 4 = ?").length).toBeGreaterThan(0);
    await pickFlipAndMark(user, false);

    const patterns = loadMistakePatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({ id: first.id, incorrectCount: 2, similarCorrectCount: 0 });
    expect(loadStatistics()).toMatchObject({ attempted: 6, correct: 4, incorrect: 2 });
  });

  it("counts a missed review question for the same fact on the seeded pattern", async () => {
    forced.reviewFact = [4, 3];
    seedAdditionMistake({ incorrectCount: 2, similarCorrectCount: 2 });
    const user = userEvent.setup({ delay: null });
    renderRoute("/practice/setup");

    await user.click(screen.getByRole("radio", { name: "Practice my mistakes" }));
    startFromSetup();
    expect(storedQuestion()).toMatchObject({
      source: "mistake-review",
      mistakePatternId: "seeded-pattern",
      displayText: "4 + 3 = ?",
    });
    await pickFlipAndMark(user, false);

    const patterns = loadMistakePatterns();
    expect(patterns).toHaveLength(1);
    expect(findPattern(patterns, "addition", 4, 3)).toMatchObject({
      id: "seeded-pattern",
      incorrectCount: 3,
      similarCorrectCount: 0,
      mastered: false,
    });
    expect(loadAttempts()[0]).toMatchObject({
      source: "mistake-review",
      mistakePatternId: "seeded-pattern",
      selfReportedCorrect: false,
    });
  });
});
