import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Navigation from "./Navigation";

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation />
    </MemoryRouter>,
  );
}

describe("Navigation", () => {
  it("lists the four page links", () => {
    renderNav();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav.querySelectorAll("a")).toHaveLength(4);
  });

  it("marks the current page", () => {
    renderNav("/statistics");
    expect(screen.getByRole("link", { name: "Statistics" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("has a Menu button that controls the link list", () => {
    renderNav();
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    const list = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(list).toContainElement(screen.getByRole("link", { name: "Home" }));
    expect(list).toHaveAttribute("data-open", "false");
  });

  it("opens and closes with the button", async () => {
    renderNav();
    const button = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("list")).toHaveAttribute("data-open", "true");
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("list")).toHaveAttribute("data-open", "false");
  });

  it("closes on Escape and returns focus to the button", async () => {
    renderNav();
    const button = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(button);
    screen.getByRole("link", { name: "Practice" }).focus();
    await userEvent.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes when a link is clicked", async () => {
    renderNav();
    const button = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(button);
    await userEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  });
});
