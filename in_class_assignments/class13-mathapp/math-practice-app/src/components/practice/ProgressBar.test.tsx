import { render, screen } from "@testing-library/react";
import ProgressBar from "./ProgressBar";

describe("ProgressBar", () => {
  it("exposes progress values and text, and updates with props", () => {
    const { rerender } = render(<ProgressBar completed={3} total={10} />);
    const bar = screen.getByRole("progressbar", { name: "Session progress" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "10");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("3 of 10 done")).toBeInTheDocument();

    rerender(<ProgressBar completed={4} total={10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
    expect(screen.getByText("4 of 10 done")).toBeInTheDocument();
  });

  it("handles an empty total without breaking", () => {
    render(<ProgressBar completed={0} total={0} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
