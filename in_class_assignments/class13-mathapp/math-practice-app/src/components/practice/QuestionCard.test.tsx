import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Question } from "../../types/question";
import QuestionCard, { type QuestionCardProps } from "./QuestionCard";

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

const nextQuestion: Question = {
  id: "q2",
  operation: "addition",
  firstOperand: 9,
  secondOperand: 4,
  displayText: "9 + 4 = ?",
  correctAnswer: 13,
  choices: [12, 13, 14, 15],
  difficulty: 1,
  source: "regular",
};

function props(overrides: Partial<QuestionCardProps> = {}): QuestionCardProps {
  return {
    question,
    questionNumber: 1,
    totalQuestions: 10,
    selectedAnswer: 54,
    isFlipped: false,
    resultRecorded: false,
    explanation: "7 groups of 8.",
    animate: false,
    onSelect: () => {},
    onFlip: () => {},
    onResult: () => {},
    ...overrides,
  };
}

describe("QuestionCard", () => {
  it("shows the front before flipping and the back after", () => {
    const { rerender } = render(<QuestionCard {...props()} />);
    expect(screen.getByRole("button", { name: "Flip Card" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I Got It Right" })).not.toBeInTheDocument();

    rerender(<QuestionCard {...props({ isFlipped: true })} />);
    expect(screen.getByRole("button", { name: "I Got It Right" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Flip Card" })).not.toBeInTheDocument();
  });

  it("renders only one face when not animated", () => {
    render(<QuestionCard {...props()} />);
    expect(screen.queryByText("Here is the answer")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What is 7 times 8?" })).toBeInTheDocument();
  });

  it("hides the inactive face from assistive tech and focus when animated", () => {
    const { rerender, container } = render(<QuestionCard {...props({ animate: true })} />);
    let inertFaces = container.querySelectorAll("[inert]");
    expect(inertFaces).toHaveLength(1);
    expect(inertFaces[0]).toHaveAttribute("aria-hidden", "true");
    expect(inertFaces[0]).toContainHTML("Here is the answer");

    rerender(<QuestionCard {...props({ animate: true, isFlipped: true })} />);
    inertFaces = container.querySelectorAll("[inert]");
    expect(inertFaces).toHaveLength(1);
    expect(inertFaces[0]).toHaveAttribute("aria-hidden", "true");
    expect(inertFaces[0]).toContainHTML("Flip Card");
    expect(screen.getByRole("button", { name: "I Got It Right" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Flip Card" })).not.toBeInTheDocument();
  });

  it("does not render the back before an answer is selected when animated", () => {
    render(<QuestionCard {...props({ animate: true, selectedAnswer: null })} />);
    expect(screen.queryByText("Here is the answer")).not.toBeInTheDocument();
  });

  it("disables the answer choices after flipping", () => {
    const { container } = render(<QuestionCard {...props({ animate: true, isFlipped: true })} />);
    const front = container.querySelector("[inert]") as HTMLElement;
    const choiceButtons = Array.from(front.querySelectorAll("button")).filter((button) =>
      button.hasAttribute("aria-pressed"),
    );
    expect(choiceButtons).toHaveLength(4);
    for (const button of choiceButtons) expect(button).toBeDisabled();
  });

  it("has an empty live region before flipping and announces the answer after", () => {
    const { rerender } = render(<QuestionCard {...props()} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(<QuestionCard {...props({ isFlipped: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("The answer is 56. You picked 54.");
  });

  it("moves focus to the back heading when flipped", () => {
    const { rerender } = render(<QuestionCard {...props()} />);
    rerender(<QuestionCard {...props({ isFlipped: true })} />);
    expect(screen.getByRole("heading", { name: "Here is the answer" })).toHaveFocus();
  });

  it("moves focus to the back heading when flipped with animation", () => {
    const { rerender } = render(<QuestionCard {...props({ animate: true })} />);
    rerender(<QuestionCard {...props({ animate: true, isFlipped: true })} />);
    expect(screen.getByRole("heading", { name: "Here is the answer" })).toHaveFocus();
  });

  it("shows the new front and focuses its heading when the question changes", () => {
    const { rerender } = render(<QuestionCard {...props({ isFlipped: true })} />);
    rerender(
      <QuestionCard
        {...props({
          question: nextQuestion,
          questionNumber: 2,
          selectedAnswer: null,
          isFlipped: false,
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "What is 9 plus 4?" })).toHaveFocus();
    expect(screen.getByText("Question 2 of 10")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("passes selection and flip events through", async () => {
    const onSelect = vi.fn();
    const onFlip = vi.fn();
    render(<QuestionCard {...props({ onSelect, onFlip })} />);
    await userEvent.click(screen.getByRole("button", { name: "48" }));
    expect(onSelect).toHaveBeenCalledWith(48);
    await userEvent.click(screen.getByRole("button", { name: "Flip Card" }));
    expect(onFlip).toHaveBeenCalledOnce();
  });
});
