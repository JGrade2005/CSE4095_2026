import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { MathOperation } from "../../types/question";
import OperationSelector from "./OperationSelector";

function Harness({
  initial = [],
  onChange = vi.fn(),
}: {
  initial?: MathOperation[];
  onChange?: (operations: MathOperation[]) => void;
}) {
  const [value, setValue] = useState<MathOperation[]>(initial);
  return (
    <OperationSelector
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("OperationSelector", () => {
  it("shows a labelled group with one checkbox per operation", () => {
    render(<Harness />);
    expect(
      screen.getByRole("group", { name: "Which math do you want to practice?" }),
    ).toBeInTheDocument();
    for (const name of [/Addition/, /Subtraction/, /Multiplication/, /Division/]) {
      expect(screen.getByRole("checkbox", { name })).not.toBeChecked();
    }
  });

  it("allows several operations and reports them in standard order", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Division/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Addition/ }));
    expect(screen.getByRole("checkbox", { name: /Division/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Addition/ })).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(["addition", "division"]);
  });

  it("unchecks an operation when clicked again", async () => {
    const onChange = vi.fn();
    render(<Harness initial={["addition", "division"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Addition/ }));
    expect(onChange).toHaveBeenLastCalledWith(["division"]);
  });

  it("selects all four operations with the mixed button", async () => {
    const onChange = vi.fn();
    render(<Harness initial={["subtraction"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "All operations (mixed)" }));
    expect(onChange).toHaveBeenLastCalledWith([
      "addition",
      "subtraction",
      "multiplication",
      "division",
    ]);
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(4);
  });

  it("marks selected operations with text as well as the checked state", () => {
    render(<Harness initial={["multiplication"]} />);
    const tile = screen.getByRole("checkbox", { name: /Multiplication/ }).closest("label");
    expect(screen.getByRole("checkbox", { name: /Multiplication/ })).toBeChecked();
    expect(tile).toHaveTextContent("✓ Selected");
    const other = screen.getByRole("checkbox", { name: /Addition/ }).closest("label");
    expect(other).not.toHaveTextContent("Selected");
  });

  it("toggles a focused option with the Space key", async () => {
    render(<Harness />);
    await userEvent.tab();
    expect(screen.getByRole("checkbox", { name: /Addition/ })).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("checkbox", { name: /Addition/ })).toBeChecked();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("checkbox", { name: /Addition/ })).not.toBeChecked();
  });

  it("uses a custom legend when given", () => {
    render(<OperationSelector legend="Default operations" value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Default operations" })).toBeInTheDocument();
  });
});
