import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Header from "./Header";
import PageContainer from "./PageContainer";

function renderLayout() {
  return render(
    <MemoryRouter>
      <Header />
      <PageContainer>
        <p>Content</p>
      </PageContainer>
    </MemoryRouter>,
  );
}

describe("Header skip link", () => {
  it("is the first focusable element and points at the main content", async () => {
    renderLayout();
    await userEvent.tab();
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#main-content");
  });

  it("moves focus to the main region when activated", async () => {
    renderLayout();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("makes the main region programmatically focusable only", () => {
    renderLayout();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("still shows the site title link", () => {
    renderLayout();
    expect(screen.getByRole("link", { name: "Math Practice" })).toBeInTheDocument();
  });
});
