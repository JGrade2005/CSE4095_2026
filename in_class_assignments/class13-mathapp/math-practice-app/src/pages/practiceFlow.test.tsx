import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadAttempts, loadMistakePatterns, loadStatistics } from "../services/practiceRecords";
import { renderRoute } from "../test/renderRoute";
import {
  advanceToNextQuestion,
  answerAndAdvance,
  resetAppStorage,
  startFromSetup,
  useFakeTimers,
  useRealTimers,
} from "../test/practiceTestUtils";

// Full sessions are many renders; the default 5s is tight when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 15000 });

beforeEach(() => {
  useFakeTimers();
  resetAppStorage();
});

afterEach(() => {
  useRealTimers();
});

// Spec 21.3, steps 1 to 8.
describe("practice flow", () => {
  it("records a mistake, then offers a similar question in review mode", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");

    startFromSetup();
    const group = screen.getByRole("group", { name: "Answer choices" });
    await user.click(within(group).getAllByRole("button")[0]);
    await user.click(screen.getByRole("button", { name: "Flip Card" }));
    await user.click(screen.getByRole("button", { name: "I Got It Wrong" }));

    expect(loadStatistics()).toMatchObject({ attempted: 1, correct: 0, incorrect: 1 });
    const patterns = loadMistakePatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({ operation: "addition", difficulty: 1, incorrectCount: 1 });

    // Finish the rest of the 5-question session.
    advanceToNextQuestion();
    for (let i = 0; i < 4; i++) answerAndAdvance(true);
    expect(router.state.location.pathname).toBe("/practice/summary");

    await user.click(screen.getByRole("button", { name: "Practice Mistakes" }));
    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();

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
  });
});
