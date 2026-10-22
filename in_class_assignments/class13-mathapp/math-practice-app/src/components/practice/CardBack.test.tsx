import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Question } from "../../types/question";
import CardBack from "./CardBack";

const question: Question = {
  id: "q1",
  operation: "multiplication",
  firstOperand: 7,
  secondOperand: 8,
  displayText: "7 × 8 = ?",
  correctAnswer: 56,
  choices: [54, 56, 48, 63],
  difficulty: 2,
  source: "regular",
};

function renderBack(overrides: Partial<React.ComponentProps<typeof CardBack>> = {}) {
  const onResult = vi.fn();
  render(
    <CardBack
      question={question}
      selectedAnswer={54}
      explanation="7 groups of 8."
      resultRecorded={false}
      onResult={onResult}
      {...overrides}
    />,
  );
  return onResult;
}

describe("CardBack", () => {
  it("shows the question, correct answer and the student's answer", () => {
    renderBack();
    expect(screen.getByText(/7 × 8 = \?/)).toBeInTheDocument();
    expect(screen.getByText("7 times 8 equals 56")).toBeInTheDocument();
    expect(screen.getByText("Your answer: 54")).toBeInTheDocument();
  });

  it("shows the explanation only when provided", () => {
    const { unmount } = render(
      <CardBack
        question={question}
        selectedAnswer={54}
        explanation="7 groups of 8."
        resultRecorded={false}
        onResult={() => {}}
      />,
    );
    expect(screen.getByText("7 groups of 8.")).toBeInTheDocument();
    unmount();
    renderBack({ explanation: null });
    expect(screen.queryByText("7 groups of 8.")).not.toBeInTheDocument();
  });

  it("reports a right or wrong result", async () => {
    const onResult = renderBack();
    await userEvent.click(screen.getByRole("button", { name: "I Got It Right" }));
    expect(onResult).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole("button", { name: "I Got It Wrong" }));
    expect(onResult).toHaveBeenLastCalledWith(false);
  });

  it("disables both buttons once the result is recorded", async () => {
    const onResult = renderBack({ resultRecorded: true });
    const right = screen.getByRole("button", { name: "I Got It Right" });
    const wrong = screen.getByRole("button", { name: "I Got It Wrong" });
    expect(right).toBeDisabled();
    expect(wrong).toBeDisabled();
    await userEvent.click(right);
    await userEvent.click(wrong);
    expect(onResult).not.toHaveBeenCalled();
  });
});
