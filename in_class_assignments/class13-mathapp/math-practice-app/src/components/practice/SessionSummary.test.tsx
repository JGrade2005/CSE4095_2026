import { render, screen } from "@testing-library/react";
import type { PracticeSession } from "../../types/session";
import SessionSummary from "./SessionSummary";

function session(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "s1",
    startedAt: "2026-03-01T12:00:00.000Z",
    completedAt: "2026-03-01T12:10:00.000Z",
    operations: ["addition", "division"],
    difficulty: 3,
    sessionLength: "continuous",
    attempted: 8,
    correct: 6,
    incorrect: 2,
    ...overrides,
  };
}

function value(label: string) {
  return screen.getByText(label).nextElementSibling;
}

describe("SessionSummary", () => {
  it("lists every summary item", () => {
    render(<SessionSummary session={session()} reviewQuestionsCompleted={3} />);
    expect(value("Questions attempted")).toHaveTextContent("8");
    expect(value("Correct")).toHaveTextContent("6");
    expect(value("Incorrect")).toHaveTextContent("2");
    expect(value("Accuracy")).toHaveTextContent("75%");
    expect(value("Operations practiced")).toHaveTextContent("Addition, Division");
    expect(value("Difficulty")).toHaveTextContent("Level 3: Intermediate");
    expect(value("Session length")).toHaveTextContent("Continuous practice");
    expect(value("Mistake-review questions")).toHaveTextContent("3");
  });

  it.each([
    [10, 10, "Amazing work!"],
    [10, 6, "Nice work!"],
    [10, 1, "Keep practicing, you are improving!"],
    [10, 0, "Keep practicing, you are improving!"],
  ])("encourages without shaming (%i attempted, %i correct)", (attempted, correct, text) => {
    render(
      <SessionSummary
        session={session({ attempted, correct, incorrect: attempted - correct })}
        reviewQuestionsCompleted={0}
      />,
    );
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("handles a session with no answers", () => {
    render(
      <SessionSummary
        session={session({ attempted: 0, correct: 0, incorrect: 0 })}
        reviewQuestionsCompleted={0}
      />,
    );
    expect(value("Accuracy")).toHaveTextContent("0%");
    expect(document.body).not.toHaveTextContent("NaN");
  });
});
