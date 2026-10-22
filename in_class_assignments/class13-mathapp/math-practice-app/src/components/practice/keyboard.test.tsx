import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import ConfirmDialog from "../common/ConfirmDialog";
import type { Question } from "../../types/question";
import QuestionCard from "./QuestionCard";

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

function Harness({ onSelectSpy = vi.fn(), withDialog = false }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  return (
    <>
      <input aria-label="Name" />
      <QuestionCard
        question={question}
        questionNumber={1}
        totalQuestions={5}
        selectedAnswer={selected}
        isFlipped={flipped}
        resultRecorded={false}
        explanation={null}
        animate={false}
        onSelect={(value) => {
          onSelectSpy(value);
          setSelected(value);
        }}
        onFlip={() => setFlipped(true)}
        onResult={() => {}}
      />
      {withDialog && (
        <ConfirmDialog
          open
          title="End this session?"
          message="Sure?"
          confirmLabel="Yes"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      )}
    </>
  );
}

describe("answer keyboard shortcuts", () => {
  it.each([
    ["1", 54],
    ["2", 56],
    ["3", 48],
    ["4", 63],
  ])("key %s picks the choice in that position", async (key, value) => {
    const spy = vi.fn();
    render(<Harness onSelectSpy={spy} />);
    await userEvent.keyboard(key);
    expect(spy).toHaveBeenCalledExactlyOnceWith(value);
    expect(screen.getByRole("button", { name: String(value) })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("lets the choice be changed with another key", async () => {
    render(<Harness />);
    await userEvent.keyboard("1");
    await userEvent.keyboard("3");
    expect(screen.getByRole("button", { name: "48" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "54" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the key hint and a number on each choice", () => {
    render(<Harness />);
    expect(screen.getByText("Tip: press 1, 2, 3 or 4 to pick an answer.")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Answer choices" });
    expect(group).toHaveTextContent("154256348463");
  });

  it("ignores other keys", async () => {
    const spy = vi.fn();
    render(<Harness onSelectSpy={spy} />);
    await userEvent.keyboard("5a0");
    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores the keys while typing in an input", async () => {
    const spy = vi.fn();
    render(<Harness onSelectSpy={spy} />);
    const input = screen.getByRole("textbox", { name: "Name" });
    await userEvent.click(input);
    await userEvent.keyboard("12");
    expect(spy).not.toHaveBeenCalled();
    expect(input).toHaveValue("12");
  });

  it("ignores the keys when a modifier is held", async () => {
    const spy = vi.fn();
    render(<Harness onSelectSpy={spy} />);
    await userEvent.keyboard("{Control>}1{/Control}");
    await userEvent.keyboard("{Alt>}2{/Alt}");
    await userEvent.keyboard("{Meta>}3{/Meta}");
    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores the keys while a confirmation dialog has focus", async () => {
    const spy = vi.fn();
    render(<Harness onSelectSpy={spy} withDialog />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.keyboard("1");
    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores the keys after the card is flipped", async () => {
    const spy = vi.fn();
    render(<Harness onSelectSpy={spy} />);
    await userEvent.keyboard("2");
    await userEvent.click(screen.getByRole("button", { name: "Flip Card" }));
    spy.mockClear();
    await userEvent.keyboard("1");
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText("Your answer: 56")).toBeInTheDocument();
  });

  it("activates a focused choice and the Flip Card button with Enter and Space", async () => {
    const onFlip = vi.fn();
    const spy = vi.fn();
    render(
      <QuestionCard
        question={question}
        questionNumber={1}
        totalQuestions={5}
        selectedAnswer={56}
        isFlipped={false}
        resultRecorded={false}
        explanation={null}
        animate={false}
        onSelect={spy}
        onFlip={onFlip}
        onResult={() => {}}
      />,
    );
    screen.getByRole("button", { name: "48" }).focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(48);

    screen.getByRole("button", { name: "Flip Card" }).focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onFlip).toHaveBeenCalledTimes(2);
  });

  it("can reach every control with Tab", async () => {
    render(<Harness />);
    await userEvent.keyboard("1");
    await userEvent.tab();
    await userEvent.tab();
    const reached: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      reached.push(document.activeElement?.textContent ?? "");
      await userEvent.tab();
    }
    expect(reached.join("|")).toContain("Flip Card");
  });
});
