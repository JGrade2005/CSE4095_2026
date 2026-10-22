import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadAttempts } from "../services/practiceRecords";
import { renderRoute } from "../test/renderRoute";
import {
  answerAndAdvance,
  resetAppStorage,
  seedAdditionMistake,
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

const reviewRadio = () => screen.getByRole("radio", { name: /Practice my mistakes/ });

describe("PracticeSetupPage review mode", () => {
  it("disables review and explains why when there are no mistakes", () => {
    renderRoute("/practice/setup");
    expect(screen.getByRole("group", { name: "How do you want to practice?" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Regular practice/ })).toBeChecked();
    expect(reviewRadio()).toBeDisabled();
    expect(reviewRadio()).toHaveAccessibleDescription(
      "No mistakes to review for these choices yet.",
    );
    expect(screen.getByText("No mistakes to review for these choices yet.")).toBeInTheDocument();
  });

  it("shows how many mistakes match the selected choices", async () => {
    seedAdditionMistake();
    renderRoute("/practice/setup");
    expect(reviewRadio()).toBeEnabled();
    expect(screen.getByText("You have 1 mistake to review for these choices.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Easy/ }));
    expect(reviewRadio()).toBeDisabled();
    expect(screen.getByText("No mistakes to review for these choices yet.")).toBeInTheDocument();
  });

  it("falls back to regular practice when the matching mistakes disappear", async () => {
    seedAdditionMistake();
    renderRoute("/practice/setup");
    await user.click(reviewRadio());
    expect(reviewRadio()).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /Easy/ }));
    expect(screen.getByRole("radio", { name: /Regular practice/ })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /Beginner/ }));
    expect(reviewRadio()).toBeEnabled();
    expect(reviewRadio()).not.toBeChecked();
  });

  it("starts a review session whose questions come from the mistake", async () => {
    seedAdditionMistake();
    renderRoute("/practice/setup");
    await user.click(reviewRadio());
    startFromSetup();

    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    answerAndAdvance(true);

    const [attempt] = loadAttempts();
    expect(attempt.source).toBe("mistake-review");
    expect(attempt.difficulty).toBe(1);
  });
});
