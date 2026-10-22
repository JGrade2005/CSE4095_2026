import { act, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
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

function props(overrides: Partial<QuestionCardProps> = {}): QuestionCardProps {
  return {
    question,
    questionNumber: 1,
    totalQuestions: 5,
    selectedAnswer: 54,
    isFlipped: false,
    resultRecorded: false,
    explanation: null,
    animate: true,
    onSelect: () => {},
    onFlip: () => {},
    onResult: () => {},
    ...overrides,
  };
}

type Listener = () => void;

function mockMatchMedia(reduce: boolean) {
  const listeners = new Set<Listener>();
  const query = {
    matches: reduce,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  };
  window.matchMedia = vi.fn(() => query) as unknown as typeof window.matchMedia;
  return {
    change(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

function Probe() {
  return <p>{usePrefersReducedMotion() ? "reduce" : "no-reduce"}</p>;
}

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe("reduced motion", () => {
  it("renders both faces for the flip when motion is allowed", () => {
    mockMatchMedia(false);
    const { container } = render(<QuestionCard {...props({ isFlipped: true })} />);
    expect(container.querySelectorAll("[inert]")).toHaveLength(1);
  });

  it("renders a single face when the user prefers reduced motion", () => {
    mockMatchMedia(true);
    const { container, rerender } = render(<QuestionCard {...props()} />);
    expect(container.querySelectorAll("[inert]")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Flip Card" })).toBeInTheDocument();
    expect(screen.queryByText("Here is the answer")).not.toBeInTheDocument();

    rerender(<QuestionCard {...props({ isFlipped: true })} />);
    expect(container.querySelectorAll("[inert]")).toHaveLength(0);
    expect(screen.getByText("Here is the answer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Flip Card" })).not.toBeInTheDocument();
  });

  it("renders a single face when the animation setting is off", () => {
    mockMatchMedia(false);
    const { container } = render(<QuestionCard {...props({ animate: false })} />);
    expect(container.querySelectorAll("[inert]")).toHaveLength(0);
  });

  it("follows changes to the preference", () => {
    const media = mockMatchMedia(false);
    render(<Probe />);
    expect(screen.getByText("no-reduce")).toBeInTheDocument();
    act(() => media.change(true));
    expect(screen.getByText("reduce")).toBeInTheDocument();
  });

  it("falls back to motion allowed when matchMedia is missing", () => {
    render(<Probe />);
    expect(screen.getByText("no-reduce")).toBeInTheDocument();
  });
});
