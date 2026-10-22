import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { Question } from "../../types/question";
import CardFront from "./CardFront";

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

function Harness({
  totalQuestions = 10,
  onFlip = () => {},
}: {
  totalQuestions?: number | null;
  onFlip?: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <CardFront
      question={question}
      questionNumber={3}
      totalQuestions={totalQuestions}
      selectedAnswer={selected}
      disabled={false}
      onSelect={setSelected}
      onFlip={onFlip}
    />
  );
}

describe("CardFront", () => {
  it("shows the question with a spoken accessible name", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "What is 7 times 8?" })).toHaveTextContent(
      "7 × 8 = ?",
    );
  });

  it("shows four answer choices in a labelled group", () => {
    render(<Harness />);
    const group = screen.getByRole("group", { name: "Answer choices" });
    expect(within(group).getAllByRole("button")).toHaveLength(4);
  });

  it("shows question progress for fixed and continuous sessions", () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByText("Question 3 of 10")).toBeInTheDocument();
    unmount();
    render(<Harness totalQuestions={null} />);
    expect(screen.getByText("Question 3")).toBeInTheDocument();
  });

  it("keeps Flip Card disabled until an answer is selected", async () => {
    render(<Harness />);
    const flip = screen.getByRole("button", { name: "Flip Card" });
    expect(flip).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "54" }));
    expect(flip).toBeEnabled();
  });

  it("lets the selection change before flipping", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "54" }));
    await userEvent.click(screen.getByRole("button", { name: "56" }));
    expect(screen.getByRole("button", { name: "56" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "54" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onFlip when Flip Card is clicked", async () => {
    const onFlip = vi.fn();
    render(<Harness onFlip={onFlip} />);
    await userEvent.click(screen.getByRole("button", { name: "48" }));
    await userEvent.click(screen.getByRole("button", { name: "Flip Card" }));
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it("disables everything when disabled", () => {
    render(
      <CardFront
        question={question}
        questionNumber={1}
        totalQuestions={5}
        selectedAnswer={56}
        disabled
        onSelect={() => {}}
        onFlip={() => {}}
      />,
    );
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });
});
