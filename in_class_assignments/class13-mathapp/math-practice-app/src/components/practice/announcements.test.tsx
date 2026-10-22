import { render, screen } from "@testing-library/react";
import type { Question } from "../../types/question";
import ProgressBar from "./ProgressBar";
import QuestionCard, { type QuestionCardProps } from "./QuestionCard";

const first: Question = {
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

const second: Question = {
  id: "q2",
  operation: "subtraction",
  firstOperand: 5,
  secondOperand: 9,
  displayText: "5 − 9 = ?",
  correctAnswer: -4,
  choices: [-4, 4, -3, 14],
  difficulty: 4,
  source: "regular",
};

function props(overrides: Partial<QuestionCardProps> = {}): QuestionCardProps {
  return {
    question: first,
    questionNumber: 1,
    totalQuestions: 5,
    selectedAnswer: null,
    isFlipped: false,
    resultRecorded: false,
    explanation: null,
    animate: false,
    onSelect: () => {},
    onFlip: () => {},
    onResult: () => {},
    ...overrides,
  };
}

describe("screen reader announcements", () => {
  it("uses a polite live region", () => {
    render(<QuestionCard {...props()} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("announces the question and progress, and again when they change", () => {
    const { rerender } = render(<QuestionCard {...props()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Question 1 of 5. What is 7 times 8?");

    rerender(
      <QuestionCard {...props({ question: second, questionNumber: 2, selectedAnswer: null })} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Question 2 of 5. What is 5 minus 9?");
  });

  it("leaves out the total in continuous mode", () => {
    render(<QuestionCard {...props({ totalQuestions: null, questionNumber: 3 })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Question 3. What is 7 times 8?");
  });

  it("announces the revealed answer after the flip", () => {
    const { rerender } = render(<QuestionCard {...props({ selectedAnswer: 54 })} />);
    rerender(<QuestionCard {...props({ selectedAnswer: 54, isFlipped: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("The answer is 56. You picked 54.");
  });

  it("speaks negative answers as minus", () => {
    render(<QuestionCard {...props({ question: second, selectedAnswer: 4, isFlipped: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("The answer is minus 4. You picked 4.");
  });

  it("names each answer choice as a number with a pressed state", () => {
    render(<QuestionCard {...props({ selectedAnswer: 48 })} />);
    expect(screen.getByRole("button", { name: "48" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "54" })).toHaveAttribute("aria-pressed", "false");
  });

  it("exposes session progress as a progressbar with text", () => {
    const { rerender } = render(<ProgressBar completed={1} total={5} />);
    expect(screen.getByRole("progressbar", { name: "Session progress" })).toHaveAttribute(
      "aria-valuetext",
      "1 of 5 done",
    );
    rerender(<ProgressBar completed={2} total={5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "2 of 5 done");
  });
});
