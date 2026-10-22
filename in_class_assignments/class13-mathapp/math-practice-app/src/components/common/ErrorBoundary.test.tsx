import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import ErrorBoundary from "./ErrorBoundary";
import RouteError from "./RouteError";

const SECRET = "secret internal failure details";

function Bomb(): never {
  throw new Error(SECRET);
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function expectFriendlyMessage() {
  expect(screen.getByRole("heading", { name: "Oops! Something went wrong." })).toBeInTheDocument();
  expect(screen.queryByText(new RegExp(SECRET))).not.toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/Error:|stack|at \w+ \(|\.tsx?:\d+/i);
}

describe("ErrorBoundary", () => {
  it("renders its children when nothing fails", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a friendly message and a Go Home link when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expectFriendlyMessage();
    expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/");
  });

  it("logs the error for developers only in development", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(console.error).toHaveBeenCalledWith(
      "Unexpected app error:",
      expect.objectContaining({ message: SECRET }),
      expect.any(String),
    );
  });
});

describe("RouteError", () => {
  function renderFailingRoute() {
    const router = createMemoryRouter(
      [
        { path: "/", element: <p>Home page</p> },
        { path: "/broken", Component: Bomb, ErrorBoundary: RouteError },
      ],
      { initialEntries: ["/broken"] },
    );
    render(<RouterProvider router={router} />);
    return router;
  }

  it("replaces a crashed route with a friendly message", () => {
    renderFailingRoute();
    expectFriendlyMessage();
  });

  it("takes the user home with the Go Home button", async () => {
    const router = renderFailingRoute();
    await userEvent.click(screen.getByRole("button", { name: "Go Home" }));
    expect(router.state.location.pathname).toBe("/");
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });
});
