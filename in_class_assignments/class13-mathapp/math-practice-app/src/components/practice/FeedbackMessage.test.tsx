import { render, screen } from "@testing-library/react";
import { CORRECT_MESSAGES, SUPPORTIVE_MESSAGES } from "../../services/feedbackMessages";
import FeedbackMessage from "./FeedbackMessage";

function shownText() {
  return screen.getByRole("status").textContent ?? "";
}

describe("FeedbackMessage", () => {
  it("shows nothing before the first result", () => {
    render(<FeedbackMessage result={null} attemptNumber={0} enabled />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a positive message with an icon for a correct result", () => {
    render(<FeedbackMessage result="correct" attemptNumber={1} enabled />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("★");
    expect(CORRECT_MESSAGES.some((message) => shownText().includes(message))).toBe(true);
    expect(status.querySelector("[aria-hidden='true']")).toHaveTextContent("★");
  });

  it("shows a supportive message with an icon for an incorrect result", () => {
    render(<FeedbackMessage result="incorrect" attemptNumber={1} enabled />);
    expect(screen.getByRole("status")).toHaveTextContent("♥");
    expect(SUPPORTIVE_MESSAGES.some((message) => shownText().includes(message))).toBe(true);
  });

  it("keeps the message after the result clears", () => {
    const { rerender } = render(<FeedbackMessage result="correct" attemptNumber={1} enabled />);
    const before = shownText();
    rerender(<FeedbackMessage result={null} attemptNumber={1} enabled />);
    expect(shownText()).toBe(before);
    rerender(<FeedbackMessage result={null} attemptNumber={1} enabled />);
    expect(shownText()).toBe(before);
  });

  it("picks a different message for the next result", () => {
    const { rerender } = render(<FeedbackMessage result="correct" attemptNumber={1} enabled />);
    const seen = new Set([shownText()]);
    for (let attempt = 2; attempt <= 12; attempt += 1) {
      const previous = shownText();
      rerender(<FeedbackMessage result={null} attemptNumber={attempt - 1} enabled />);
      rerender(<FeedbackMessage result="correct" attemptNumber={attempt} enabled />);
      expect(shownText()).not.toBe(previous);
      seen.add(shownText());
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("switches to a supportive message when the next result is incorrect", () => {
    const { rerender } = render(<FeedbackMessage result="correct" attemptNumber={1} enabled />);
    rerender(<FeedbackMessage result="incorrect" attemptNumber={2} enabled />);
    expect(screen.getByRole("status")).toHaveTextContent("♥");
  });

  it("renders nothing when disabled", () => {
    const { container } = render(
      <FeedbackMessage result="correct" attemptNumber={1} enabled={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
