import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnswerChoice from "./AnswerChoice";

describe("AnswerChoice", () => {
  it("shows the number and is not pressed or marked by default", () => {
    render(<AnswerChoice value={56} selected={false} disabled={false} onSelect={() => {}} />);
    const button = screen.getByRole("button", { name: "56" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).not.toHaveTextContent("✓");
  });

  it("is pressed and shows a visible marker when selected", () => {
    render(<AnswerChoice value={56} selected disabled={false} onSelect={() => {}} />);
    const button = screen.getByRole("button", { name: "56" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("✓");
  });

  it("calls onSelect with its value", async () => {
    const onSelect = vi.fn();
    render(<AnswerChoice value={56} selected={false} disabled={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "56" }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(56);
  });

  it("blocks clicks when disabled", async () => {
    const onSelect = vi.fn();
    render(<AnswerChoice value={56} selected={false} disabled onSelect={onSelect} />);
    const button = screen.getByRole("button", { name: "56" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
