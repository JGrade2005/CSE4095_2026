import { screen } from "@testing-library/react";
import { CORRECT_MESSAGES, SUPPORTIVE_MESSAGES } from "../services/feedbackMessages";
import { renderRoute } from "../test/renderRoute";
import {
  answerAndAdvance,
  answerQuestion,
  resetAppStorage,
  startFromSetup,
  useFakeTimers,
  useRealTimers,
} from "../test/practiceTestUtils";

vi.setConfig({ testTimeout: 15000 });

function feedbackText(): string | null {
  const messages = [...CORRECT_MESSAGES, ...SUPPORTIVE_MESSAGES];
  const match = screen
    .queryAllByRole("status")
    .find((element) => messages.some((message) => element.textContent?.includes(message)));
  return match?.textContent ?? null;
}

afterEach(() => {
  useRealTimers();
});

describe("PracticePage feedback", () => {
  it("shows a positive message after a right answer and keeps it on the next card", () => {
    useFakeTimers();
    resetAppStorage();
    renderRoute("/practice/setup");
    startFromSetup();

    answerAndAdvance(true);
    const text = feedbackText();
    expect(CORRECT_MESSAGES.some((message) => text?.includes(message))).toBe(true);
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
  });

  it("shows a supportive message after a wrong answer", () => {
    useFakeTimers();
    resetAppStorage();
    renderRoute("/practice/setup");
    startFromSetup();

    answerQuestion(false);
    const text = feedbackText();
    expect(SUPPORTIVE_MESSAGES.some((message) => text?.includes(message))).toBe(true);
  });

  it("shows no message when feedback is turned off in settings", () => {
    useFakeTimers();
    resetAppStorage({ feedbackMessagesEnabled: false });
    renderRoute("/practice/setup");
    startFromSetup();

    answerQuestion(true);
    expect(feedbackText()).toBeNull();
  });
});
