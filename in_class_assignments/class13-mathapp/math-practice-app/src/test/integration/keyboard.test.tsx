import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadAttempts, loadStatistics } from "../../services/practiceRecords";
import {
  advanceToNextQuestion,
  resetAppStorage,
  useFakeTimers,
  useRealTimers,
} from "../practiceTestUtils";
import { renderRoute } from "../renderRoute";
import { summaryValue, tabTo } from "../integrationUtils";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  useFakeTimers();
  resetAppStorage();
});

afterEach(() => {
  useRealTimers();
});

describe("a session completed with the keyboard only", () => {
  it("starts, answers five questions and returns home using only Tab, number keys and Enter", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/");

    await tabTo(user, screen.getByRole("button", { name: "Start Practice" }));
    await user.keyboard("{Enter}");
    expect(router.state.location.pathname).toBe("/practice/setup");

    await tabTo(user, screen.getByRole("button", { name: "Start Session" }));
    await user.keyboard("{Enter}");
    expect(router.state.location.pathname).toBe("/practice/session");

    const results = [true, false, true, true, false];
    for (const [index, correct] of results.entries()) {
      expect(screen.getByText(`Question ${index + 1} of 5`)).toBeInTheDocument();

      if (index % 2 === 0) {
        await user.keyboard(String(((index * 2) % 4) + 1));
      } else {
        const group = screen.getByRole("group", { name: "Answer choices" });
        await tabTo(user, within(group).getAllByRole("button")[2]);
        await user.keyboard("{Enter}");
      }
      expect(
        within(screen.getByRole("group", { name: "Answer choices" })).getAllByRole("button", {
          pressed: true,
        }),
      ).toHaveLength(1);

      await tabTo(user, screen.getByRole("button", { name: "Flip Card" }));
      await user.keyboard("{Enter}");
      expect(screen.getByRole("heading", { name: "Here is the answer" })).toHaveFocus();

      await tabTo(
        user,
        screen.getByRole("button", { name: correct ? "I Got It Right" : "I Got It Wrong" }),
      );
      await user.keyboard("{Enter}");
      advanceToNextQuestion();
    }

    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(summaryValue("Questions attempted")).toBe("5");
    expect(summaryValue("Correct")).toBe("3");
    expect(loadAttempts()).toHaveLength(5);
    expect(loadStatistics()).toMatchObject({ attempted: 5, correct: 3, incorrect: 2 });

    await tabTo(user, screen.getByRole("button", { name: "Return Home" }));
    await user.keyboard("{Enter}");
    expect(router.state.location.pathname).toBe("/");
  });

  it("keeps Flip Card disabled until an answer is picked with a number key", async () => {
    const user = userEvent.setup({ delay: null });
    renderRoute("/practice/setup");
    await tabTo(user, screen.getByRole("button", { name: "Start Session" }));
    await user.keyboard("{Enter}");

    const flip = screen.getByRole("button", { name: "Flip Card" });
    expect(flip).toBeDisabled();
    await user.keyboard("2");
    expect(flip).toBeEnabled();
  });
});
