import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { seedStorage } from "../test/statisticsTestData";
import { resetStorageServiceState } from "../services/storageService";
import StatisticsPage from "./StatisticsPage";

function overallRegion() {
  return screen.getByRole("region", { name: "Overall results" });
}

function getCard(headingName: string): HTMLElement {
  const card = screen.getByRole("heading", { name: headingName }).closest("li");
  if (!card) throw new Error(`No card for ${headingName}`);
  return card;
}

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
});

describe("StatisticsPage with no data", () => {
  it("shows friendly empty states and never NaN", () => {
    render(<StatisticsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Statistics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No practice yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No sessions yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No mistakes yet" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("shows zeros and 0% accuracy", () => {
    render(<StatisticsPage />);
    const overall = within(overallRegion());
    expect(overall.getByText("Questions attempted").nextElementSibling).toHaveTextContent("0");
    expect(overall.getByText("Accuracy").nextElementSibling).toHaveTextContent("0%");
  });
});

describe("StatisticsPage with seeded data", () => {
  beforeEach(() => {
    seedStorage();
  });

  it("shows the overall totals and accuracy", () => {
    render(<StatisticsPage />);
    const overall = within(overallRegion());
    expect(overall.getByText("Questions attempted").nextElementSibling).toHaveTextContent("10");
    expect(overall.getByText("Correct answers").nextElementSibling).toHaveTextContent("7");
    expect(overall.getByText("Incorrect answers").nextElementSibling).toHaveTextContent("3");
    expect(overall.getByText("Accuracy").nextElementSibling).toHaveTextContent("70%");
    expect(screen.queryByRole("heading", { name: "No practice yet" })).not.toBeInTheDocument();
  });

  it("shows one card per operation with totals and accuracy", () => {
    render(<StatisticsPage />);
    const region = screen.getByRole("region", { name: "Results by operation" });
    expect(within(region).getAllByRole("listitem")).toHaveLength(4);
    const multiplication = within(getCard("Multiplication"));
    expect(multiplication.getByText("Attempted").nextElementSibling).toHaveTextContent("3");
    expect(multiplication.getByText("Correct").nextElementSibling).toHaveTextContent("1");
    expect(multiplication.getByText("Incorrect").nextElementSibling).toHaveTextContent("2");
    expect(multiplication.getByText("Accuracy").nextElementSibling).toHaveTextContent("33%");
    expect(
      within(getCard("Subtraction")).getByText("Accuracy").nextElementSibling,
    ).toHaveTextContent("100%");
  });

  it("shows four labelled level cards, including a level with no practice", () => {
    render(<StatisticsPage />);
    const region = screen.getByRole("region", { name: "Results by level" });
    expect(within(region).getAllByRole("listitem")).toHaveLength(4);
    for (const name of [
      "Level 1: Beginner",
      "Level 2: Easy",
      "Level 3: Intermediate",
      "Level 4: Advanced",
    ]) {
      expect(within(region).getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(
      within(getCard("Level 1: Beginner")).getByText("Accuracy").nextElementSibling,
    ).toHaveTextContent("80%");
    expect(
      within(getCard("Level 4: Advanced")).getByText("Accuracy").nextElementSibling,
    ).toHaveTextContent("0%");
  });

  it("lists recent sessions newest first with their details", () => {
    render(<StatisticsPage />);
    const table = screen.getByRole("table", { name: "Your most recent practice sessions" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Division, Multiplication");
    expect(rows[1]).toHaveTextContent("Subtraction");
    expect(rows[2]).toHaveTextContent("Addition");

    const newest = within(rows[0]);
    expect(
      newest.getByText(new Date("2026-03-20T12:00:00.000Z").toLocaleDateString()),
    ).toBeVisible();
    expect(newest.getByText("Level 3: Intermediate")).toBeInTheDocument();
    expect(newest.getByText("67%")).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("100%");
    expect(rows[2]).toHaveTextContent("75%");
  });

  it("shows only the 10 newest sessions", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: `s${index}`,
      startedAt: new Date(2026, 0, index + 1).toISOString(),
      operations: ["addition"],
      difficulty: 1,
      sessionLength: 5,
      attempted: 1,
      correct: 1,
      incorrect: 0,
    }));
    localStorage.setItem("mathPractice.sessions", JSON.stringify(many));
    render(<StatisticsPage />);
    expect(screen.getAllByRole("row")).toHaveLength(11);
  });

  it("shows the mistake statistics", () => {
    render(<StatisticsPage />);
    const region = within(screen.getByRole("region", { name: "Mistake review" }));
    expect(region.getByText("Active mistake patterns").nextElementSibling).toHaveTextContent("3");
    expect(region.getByText("Mastered patterns").nextElementSibling).toHaveTextContent("1");
    expect(region.getByText("Similar questions practiced").nextElementSibling).toHaveTextContent(
      "4",
    );
    expect(
      region.getByText("Review questions answered correctly").nextElementSibling,
    ).toHaveTextContent("3");
    expect(
      region.getByRole("heading", { name: "Most missed operation" }).nextElementSibling,
    ).toHaveTextContent("Multiplication");

    const facts = within(region.getByRole("list", { name: "Most missed number facts" }));
    const items = facts.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("7 × 8 = 56");
    expect(items[0]).toHaveTextContent("Missed 4 times");
    expect(items[1]).toHaveTextContent("5 + 6 = 11");
    expect(items[2]).toHaveTextContent("6 × 7 = 42");
  });

  it("lists active patterns with progress using the saved mastery threshold", () => {
    render(<StatisticsPage />);
    const list = within(screen.getByRole("list", { name: "Active mistake patterns" }));
    const items = list.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("7 × 8 = 56");
    expect(items[0]).toHaveTextContent("Progress: 1 of 4 correct");
    expect(items[0]).toHaveTextContent(
      `Last missed: ${new Date("2026-03-01T12:00:00.000Z").toLocaleDateString()}`,
    );
    expect(list.queryByText("12 ÷ 4 = 3")).not.toBeInTheDocument();
  });

  it("shows mastered patterns separately with the toggle", async () => {
    const user = userEvent.setup();
    render(<StatisticsPage />);
    const toggle = screen.getByRole("button", { name: "Show mastered patterns" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    const list = within(screen.getByRole("list", { name: "Mastered mistake patterns" }));
    expect(list.getAllByRole("listitem")).toHaveLength(1);
    expect(list.getByText("12 ÷ 4 = 3")).toBeInTheDocument();
    expect(list.getByText("Mastered")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Active mistake patterns" })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("list", { name: "Active mistake patterns" })).toBeInTheDocument();
  });

  it("shows a message when there are no mastered patterns yet", async () => {
    localStorage.setItem(
      "mathPractice.mistakePatterns",
      JSON.stringify([
        {
          id: "only",
          operation: "addition",
          firstOperand: 1,
          secondOperand: 2,
          correctAnswer: 3,
          difficulty: 1,
          incorrectCount: 1,
          similarCorrectCount: 0,
          lastIncorrectAt: "2026-03-01T12:00:00.000Z",
          mastered: false,
        },
      ]),
    );
    const user = userEvent.setup();
    render(<StatisticsPage />);
    await user.click(screen.getByRole("button", { name: "Show mastered patterns" }));
    expect(screen.getByText("No mastered patterns yet.")).toBeInTheDocument();
  });
});
