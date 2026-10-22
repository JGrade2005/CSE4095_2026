import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadActiveSession } from "../services/activeSessionStore";
import { loadSessions } from "../services/practiceRecords";
import { STORAGE_KEYS } from "../services/storageKeys";
import {
  answerAndAdvance,
  resetAppStorage,
  startFromSetup,
  useFakeTimers,
  useRealTimers,
} from "../test/practiceTestUtils";
import { renderRoute } from "../test/renderRoute";

vi.setConfig({ testTimeout: 15000 });

let user: ReturnType<typeof userEvent.setup>;

beforeEach(async () => {
  useFakeTimers();
  user = userEvent.setup({ delay: null });
  resetAppStorage();
  // Statistics is a lazy route; loading it needs real I/O that fake timers cannot wait for.
  await import("./StatisticsPage");
});

afterEach(() => {
  useRealTimers();
});

const leaveDialog = () => screen.queryByRole("alertdialog", { name: "Leave practice?" });

function startSession() {
  const view = renderRoute("/practice/setup");
  startFromSetup();
  return view;
}

describe("PracticePage leave protection", () => {
  it("asks before a nav link leaves an active session", async () => {
    const { router } = startSession();

    await user.click(screen.getByRole("link", { name: "Statistics" }));

    const dialog = screen.getByRole("alertdialog", { name: "Leave practice?" });
    expect(dialog).toHaveTextContent(
      "Your session is still going. If you leave now, it will end and your answers so far are saved.",
    );
    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByRole("button", { name: "Keep practicing" })).toHaveFocus();
  });

  it("keeps the session when the user chooses Keep practicing", async () => {
    const { router } = startSession();
    answerAndAdvance(true);

    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "Keep practicing" }));

    expect(leaveDialog()).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
    expect(loadActiveSession()).not.toBeNull();
  });

  it("keeps the session when the dialog is dismissed with Escape", async () => {
    const { router } = startSession();

    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.keyboard("{Escape}");

    expect(leaveDialog()).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/practice/session");
  });

  it("asks again the next time after Keep practicing", async () => {
    startSession();
    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "Keep practicing" }));

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(screen.getByRole("alertdialog", { name: "Leave practice?" })).toBeInTheDocument();
  });

  it("ends the session and navigates away when the user leaves", async () => {
    const { router } = startSession();
    answerAndAdvance(true);
    answerAndAdvance(false);

    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "Leave and end session" }));

    expect(router.state.location.pathname).toBe("/");
    expect(leaveDialog()).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    const [saved] = loadSessions();
    expect(saved.attempted).toBe(2);
    expect(saved.completedAt).toBeDefined();
  });

  it("goes to the page that was clicked, not the summary", async () => {
    const { router } = startSession();

    await user.click(screen.getByRole("link", { name: "Statistics" }));
    await user.click(screen.getByRole("button", { name: "Leave and end session" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Statistics" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/statistics");
  });

  it("shows the finished session on the summary after leaving", async () => {
    const { router } = startSession();
    answerAndAdvance(true);

    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "Leave and end session" }));
    await act(() => router.navigate("/practice/summary"));

    expect(
      screen.getByRole("heading", { level: 1, name: "Session complete!" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Questions attempted").nextElementSibling).toHaveTextContent("1");
  });

  it("also protects programmatic navigation such as the back button", async () => {
    const { router } = startSession();

    await act(() => router.navigate(-1));

    expect(screen.getByRole("alertdialog", { name: "Leave practice?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/practice/session");
  });

  it("does not ask after the last question: the summary opens straight away", async () => {
    const { router } = startSession();
    for (let i = 0; i < 5; i++) answerAndAdvance(true);

    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(leaveDialog()).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(leaveDialog()).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("does not ask when End Session is confirmed in a continuous session", async () => {
    resetAppStorage({ defaultSessionLength: "continuous" });
    const { router } = startSession();
    answerAndAdvance(true);

    await user.click(screen.getByRole("button", { name: "End Session" }));
    await user.click(screen.getByRole("button", { name: "Yes, finish" }));

    expect(leaveDialog()).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(
      screen.getByRole("heading", { level: 1, name: "Session complete!" }),
    ).toBeInTheDocument();
  });

  it("does not ask when there is no session to protect", async () => {
    const { router } = renderRoute("/practice/session");

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(leaveDialog()).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});
