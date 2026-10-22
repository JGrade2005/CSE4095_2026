import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { createDefaultSettings } from "../../services/defaults";
import type { SessionLength } from "../../types/session";
import SessionLengthSelector from "./SessionLengthSelector";

function Harness({ initial }: { initial: SessionLength }) {
  const [value, setValue] = useState<SessionLength>(initial);
  return <SessionLengthSelector value={value} onChange={setValue} />;
}

describe("SessionLengthSelector", () => {
  it("offers 5, 10, 20 questions and continuous practice", () => {
    render(<Harness initial={10} />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    for (const name of ["5 questions", "10 questions", "20 questions", "Continuous practice"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
  });

  it("starts on the value it is given, which is the settings default", () => {
    const { defaultSessionLength } = createDefaultSettings();
    render(<Harness initial={defaultSessionLength} />);
    expect(screen.getByRole("radio", { name: "10 questions" })).toBeChecked();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
  });

  it("changes the selected option and shows a marker", async () => {
    render(<Harness initial={10} />);
    await userEvent.click(screen.getByRole("radio", { name: "Continuous practice" }));
    const selected = screen.getByRole("radio", { name: "Continuous practice" });
    expect(selected).toBeChecked();
    expect(selected.closest("label")).toHaveTextContent("✓ Selected");
    expect(screen.getByRole("radio", { name: "10 questions" })).not.toBeChecked();
  });

  it("moves between options with the arrow keys", async () => {
    render(<Harness initial={5} />);
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "10 questions" })).toBeChecked();
  });
});
