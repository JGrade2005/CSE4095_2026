import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { DifficultyLevel } from "../../types/question";
import { DIFFICULTY_DESCRIPTIONS } from "../../utils/labels";
import DifficultySelector from "./DifficultySelector";

function Harness({ initial = 1 as DifficultyLevel }) {
  const [value, setValue] = useState<DifficultyLevel>(initial);
  return <DifficultySelector value={value} onChange={setValue} />;
}

describe("DifficultySelector", () => {
  it("shows four levels with their labels and descriptions", () => {
    render(<Harness />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    for (const [level, label] of [
      [1, "Beginner"],
      [2, "Easy"],
      [3, "Intermediate"],
      [4, "Advanced"],
    ] as const) {
      const radio = screen.getByRole("radio", { name: new RegExp(label) });
      expect(radio.closest("label")).toHaveTextContent(DIFFICULTY_DESCRIPTIONS[level]);
    }
  });

  it("selects exactly one level at a time", async () => {
    render(<Harness />);
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    await userEvent.click(screen.getByRole("radio", { name: /Intermediate/ }));
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(screen.getByRole("radio", { name: /Intermediate/ })).toBeChecked();
  });

  it("marks the selected level with text as well as the checked state", () => {
    render(<Harness initial={2} />);
    const selected = screen.getByRole("radio", { name: /Easy/ });
    expect(selected).toBeChecked();
    expect(selected.closest("label")).toHaveTextContent("✓ Selected");
    expect(screen.getByRole("radio", { name: /Beginner/ }).closest("label")).not.toHaveTextContent(
      "Selected",
    );
  });

  it("moves between levels with the arrow keys", async () => {
    render(<Harness />);
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: /Beginner/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /Easy/ })).toBeChecked();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /Intermediate/ })).toBeChecked();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: /Easy/ })).toBeChecked();
  });

  it("uses a custom legend when given", () => {
    render(<DifficultySelector legend="Default difficulty" value={1} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Default difficulty" })).toBeInTheDocument();
  });
});
