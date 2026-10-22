import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadAttempts } from "../services/practiceRecords";
import { renderRoute } from "../test/renderRoute";
import {
  answerAndAdvance,
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

function statValue(label: string) {
  return screen.getByText(label).nextElementSibling;
}

async function finishSession(results: boolean[]) {
  const view = renderRoute("/practice/setup");
  startFromSetup();
  for (const correct of results) answerAndAdvance(correct);
  return view;
}

describe("SessionSummaryPage with a finished session", () => {
  it("shows totals, accuracy, operations, level, length and review count", async () => {
    await finishSession([true, true, true, false, false]);

    expect(
      screen.getByRole("heading", { level: 1, name: "Session complete!" }),
    ).toBeInTheDocument();
    expect(statValue("Questions attempted")).toHaveTextContent("5");
    expect(statValue("Correct")).toHaveTextContent("3");
    expect(statValue("Incorrect")).toHaveTextContent("2");
    expect(statValue("Accuracy")).toHaveTextContent("60%");
    expect(statValue("Operations practiced")).toHaveTextContent("Addition");
    expect(statValue("Difficulty")).toHaveTextContent("Level 1: Beginner");
    expect(statValue("Session length")).toHaveTextContent("5 questions");
    expect(statValue("Mistake-review questions")).toHaveTextContent("0");
    expect(screen.getByText("Nice work!")).toBeInTheDocument();
  });

  it("Practice Again starts a new session with the same choices", async () => {
    const { router } = await finishSession([true, true, true, true, true]);
    await user.click(screen.getByRole("button", { name: "Practice Again" }));

    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("disables Practice Mistakes and explains why when there is nothing to review", async () => {
    await finishSession([true, true, true, true, true]);
    const button = screen.getByRole("button", { name: "Practice Mistakes" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("No mistakes to review for these choices yet.");
    expect(screen.getByText("No mistakes to review for these choices yet.")).toBeVisible();
  });

  it("enables Practice Mistakes after a wrong answer and starts a review session", async () => {
    const { router } = await finishSession([false, true, true, true, true]);
    const button = screen.getByRole("button", { name: "Practice Mistakes" });
    expect(button).toBeEnabled();
    expect(screen.queryByText("No mistakes to review for these choices yet.")).toBeNull();

    await user.click(button);
    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    answerAndAdvance(true);
    expect(loadAttempts().at(-1)?.source).toBe("mistake-review");
  });

  it("counts mistake-review questions on the next summary", async () => {
    // A high threshold keeps the pattern in review for all five questions.
    resetAppStorage({ masteryThreshold: 10 });
    await finishSession([false, true, true, true, true]);
    await user.click(screen.getByRole("button", { name: "Practice Mistakes" }));
    for (let i = 0; i < 5; i++) answerAndAdvance(true);

    expect(statValue("Mistake-review questions")).toHaveTextContent("5");
  });

  it("Change Settings, View Statistics and Return Home navigate", async () => {
    const { router } = await finishSession([true, true, true, true, true]);

    await user.click(screen.getByRole("button", { name: "Change Settings" }));
    expect(router.state.location.pathname).toBe("/practice/setup");

    await router.navigate("/practice/summary");
    await user.click(await screen.findByRole("button", { name: "View Statistics" }));
    expect(router.state.location.pathname).toBe("/statistics");

    await router.navigate("/practice/summary");
    await user.click(await screen.findByRole("button", { name: "Return Home" }));
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("SessionSummaryPage without a finished session", () => {
  it("shows a friendly message and the Home button", async () => {
    const { router } = renderRoute("/practice/summary");
    expect(screen.getByRole("heading", { name: "No finished session yet" })).toBeInTheDocument();
    expect(screen.queryByText("Questions attempted")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Return Home" }));
    expect(router.state.location.pathname).toBe("/");
  });

  it("offers Set Up Practice", async () => {
    const { router } = renderRoute("/practice/summary");
    await user.click(screen.getByRole("button", { name: "Set Up Practice" }));
    expect(router.state.location.pathname).toBe("/practice/setup");
  });
});
