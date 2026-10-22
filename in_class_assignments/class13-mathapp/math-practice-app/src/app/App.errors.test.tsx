import { render, screen } from "@testing-library/react";
import { renderRoute } from "../test/renderRoute";
import App from "./App";

const crash = vi.hoisted(() => ({ page: false, provider: false }));

vi.mock("../pages/HomePage", () => ({
  default: () => {
    if (crash.page) throw new Error("page exploded");
    return <h1>Home</h1>;
  },
}));

vi.mock("./PracticeSessionProvider", () => ({
  default: ({ children }: { children: React.ReactNode }) => {
    if (crash.provider) throw new Error("provider exploded");
    return children;
  },
}));

beforeEach(() => {
  crash.page = false;
  crash.provider = false;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app-level error handling", () => {
  it("shows the friendly route error when a page crashes", () => {
    crash.page = true;
    renderRoute("/");
    expect(
      screen.getByRole("heading", { name: "Oops! Something went wrong." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go Home" })).toBeInTheDocument();
    expect(screen.queryByText(/page exploded/)).not.toBeInTheDocument();
  });

  it("catches a crash inside a provider with the outer boundary", () => {
    crash.provider = true;
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Oops! Something went wrong." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Home" })).toBeInTheDocument();
    expect(screen.queryByText(/provider exploded/)).not.toBeInTheDocument();
  });
});
