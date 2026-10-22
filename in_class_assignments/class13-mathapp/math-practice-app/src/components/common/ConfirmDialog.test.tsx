import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

function Harness({ onConfirm = vi.fn(), onCancel = vi.fn() }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Reset</button>
      <ConfirmDialog
        open={open}
        title="Reset statistics?"
        message="Are you sure?"
        confirmLabel="Yes, reset"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onCancel={() => {
          onCancel();
          setOpen(false);
        }}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("opens as a labelled alertdialog with focus on Cancel", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Reset" }));
    const dialog = screen.getByRole("alertdialog", { name: "Reset statistics?" });
    expect(dialog).toHaveAccessibleDescription("Are you sure?");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("calls onConfirm and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Reset" }));
    await user.click(screen.getByRole("button", { name: "Yes, reset" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toHaveFocus();
  });

  it("cancels with the Cancel button and with Escape", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Reset" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Reset" }));
    await user.tab();
    expect(screen.getByRole("button", { name: "Yes, reset" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Yes, reset" })).toHaveFocus();
  });
});
