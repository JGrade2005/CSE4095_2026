import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the home page at /", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to Math Practice!" }),
    ).toBeInTheDocument();
  });
});
