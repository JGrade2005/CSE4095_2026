import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getPatternKey } from "../../services/mistakeService";
import {
  initializeStorage,
  loadAttempts,
  loadMistakePatterns,
  loadSessions,
  loadStatistics,
} from "../../services/practiceRecords";
import { generateQuestion, generateQuestionForOperations } from "../../services/questionGenerator";
import { generateSimilarQuestion } from "../../services/similarQuestionGenerator";
import { STORAGE_KEYS } from "../../services/storageKeys";
import { resetStorageServiceState } from "../../services/storageService";
import { DIFFICULTY_LEVELS, MATH_OPERATIONS } from "../../types/question";
import type { MistakePattern } from "../../types/mistake";
import { validateQuestion } from "../../utils/validation";
import {
  answerAndAdvance,
  resetAppStorage,
  startFromSetup,
  useFakeTimers,
  useRealTimers,
} from "../practiceTestUtils";
import { renderRoute } from "../renderRoute";
import {
  answerAll,
  chooseSessionLength,
  goTo,
  summaryValue,
  warmLazyRoutes,
} from "../integrationUtils";

// Full sessions are many renders; the default 5s is tight when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 15000 });

beforeAll(warmLazyRoutes);

const ROUTES: Array<[string, string]> = [
  ["/", "Welcome to Math Practice!"],
  ["/practice/setup", "Practice Setup"],
  ["/practice/session", "Practice"],
  ["/practice/summary", "Session Summary"],
  ["/statistics", "Statistics"],
  ["/settings", "Settings"],
];

function expectCleanPage() {
  expect(document.body).not.toHaveTextContent("NaN");
  expect(document.body).not.toHaveTextContent("undefined");
  expect(document.body).not.toHaveTextContent("Infinity");
  expect(screen.queryByText(/Oops/)).not.toBeInTheDocument();
}

describe("no stored data", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageServiceState();
  });

  it.each(ROUTES)("%s renders with defaults", async (path, heading) => {
    renderRoute(path);
    expect(
      await screen.findByRole("heading", { level: 1, name: heading }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expectCleanPage();
  });

  it("shows empty states and 0% on the statistics page", async () => {
    renderRoute("/statistics");
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    const overall = within(screen.getByRole("region", { name: "Overall results" }));
    expect(overall.getByText("Questions attempted").nextElementSibling).toHaveTextContent("0");
    expect(overall.getByText("Accuracy").nextElementSibling).toHaveTextContent("0%");
    expect(screen.getByRole("heading", { name: "No practice yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No sessions yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No mistakes yet" })).toBeInTheDocument();
  });

  it("offers regular practice only on the setup page", () => {
    renderRoute("/practice/setup");
    expect(screen.getByRole("radio", { name: "Regular practice" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Practice my mistakes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start Session" })).toBeEnabled();
  });
});

describe("corrupted stored data", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageServiceState();
  });

  it.each(Object.values(STORAGE_KEYS))(
    "every page still renders when %s is garbage",
    async (key) => {
      localStorage.setItem(key, "garbage {{{");
      initializeStorage();

      for (const [path, heading] of ROUTES) {
        const { unmount } = renderRoute(path);
        expect(
          await screen.findByRole("heading", { level: 1, name: heading }, { timeout: 5000 }),
        ).toBeInTheDocument();
        expectCleanPage();
        unmount();
      }
    },
  );

  it("falls back to empty data when every key holds the wrong shape", async () => {
    for (const key of Object.values(STORAGE_KEYS))
      localStorage.setItem(key, '{"unexpected":[1,2]}');
    initializeStorage();

    renderRoute("/statistics");
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    expect(screen.getByRole("heading", { name: "No practice yet" })).toBeInTheDocument();
    expectCleanPage();
  });

  describe("and then practicing", () => {
    beforeEach(useFakeTimers);
    afterEach(useRealTimers);

    it("lets a session run and saves clean data afterwards", () => {
      for (const key of Object.values(STORAGE_KEYS)) localStorage.setItem(key, "garbage {{{");
      initializeStorage();

      const { router } = renderRoute("/practice/setup");
      chooseSessionLength("5 questions");
      startFromSetup();
      for (let i = 0; i < 5; i++) {
        answerAndAdvance(true);
        act(() => {
          vi.advanceTimersByTime(700);
        });
      }

      expect(router.state.location.pathname).toBe("/practice/summary");
      expect(summaryValue("Questions attempted")).toBe("5");
      expect(loadStatistics()).toMatchObject({ attempted: 5, correct: 5 });
      expectCleanPage();
    });
  });
});

describe("sessions", () => {
  beforeEach(() => {
    useFakeTimers();
    resetAppStorage();
  });

  afterEach(useRealTimers);

  it("handles zero attempts without NaN", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");
    chooseSessionLength("Continuous practice");
    startFromSetup();

    await user.click(screen.getByRole("button", { name: "End Session" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("You answered 0 questions.");
    await user.click(screen.getByRole("button", { name: "Yes, finish" }));

    expect(router.state.location.pathname).toBe("/practice/summary");
    expect(summaryValue("Questions attempted")).toBe("0");
    expect(summaryValue("Accuracy")).toBe("0%");
    expect(screen.getByText("Good try! Come back and practice again soon.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Practice Mistakes" })).toBeDisabled();
    expectCleanPage();

    await goTo(router, "/statistics");
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    expect(loadSessions()).toHaveLength(1);
    const sessions = screen.getByRole("table", { name: "Your most recent practice sessions" });
    expect(within(sessions).getAllByRole("row")[1]).toHaveTextContent("0%");
    expectCleanPage();
  });

  it("reports 100% when every answer is correct and stores no mistakes", async () => {
    const { router } = renderRoute("/practice/setup");
    startFromSetup();
    answerAll([true, true, true, true, true]);

    expect(summaryValue("Accuracy")).toBe("100%");
    expect(summaryValue("Incorrect")).toBe("0");
    expect(screen.getByText("Amazing work!")).toBeInTheDocument();
    expect(loadMistakePatterns()).toEqual([]);
    expect(screen.getByRole("button", { name: "Practice Mistakes" })).toBeDisabled();

    await goTo(router, "/statistics");
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    const overall = within(screen.getByRole("region", { name: "Overall results" }));
    expect(overall.getByText("Accuracy").nextElementSibling).toHaveTextContent("100%");
    expect(screen.getByRole("heading", { name: "No mistakes yet" })).toBeInTheDocument();
    expectCleanPage();
  });

  it("reports 0% when every answer is wrong, with one pattern per distinct fact", async () => {
    const { router } = renderRoute("/practice/setup");
    chooseSessionLength("10 questions");
    startFromSetup();
    answerAll(Array.from({ length: 10 }, () => false));

    expect(summaryValue("Accuracy")).toBe("0%");
    expect(summaryValue("Correct")).toBe("0");
    expect(screen.getByText("Keep practicing, you are improving!")).toBeInTheDocument();

    const attempts = loadAttempts();
    const missesByFact = new Map<string, number>();
    for (const attempt of attempts) {
      const key = getPatternKey(attempt.operation, attempt.firstOperand, attempt.secondOperand);
      missesByFact.set(key, (missesByFact.get(key) ?? 0) + 1);
    }
    const patterns = loadMistakePatterns();
    expect(patterns).toHaveLength(missesByFact.size);
    for (const pattern of patterns) {
      const key = getPatternKey(pattern.operation, pattern.firstOperand, pattern.secondOperand);
      expect(pattern.incorrectCount).toBe(missesByFact.get(key));
    }
    expect(patterns.reduce((sum, pattern) => sum + pattern.incorrectCount, 0)).toBe(10);

    await goTo(router, "/statistics");
    await screen.findByRole("heading", { level: 1, name: "Statistics" });
    expect(screen.getByText("Active mistake patterns").nextElementSibling).toHaveTextContent(
      String(missesByFact.size),
    );
    const overall = within(screen.getByRole("region", { name: "Overall results" }));
    expect(overall.getByText("Accuracy").nextElementSibling).toHaveTextContent("0%");
    expectCleanPage();
  });

  it("keeps continuous practice going past 20 questions until the child ends it", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderRoute("/practice/setup");
    chooseSessionLength("Continuous practice");
    startFromSetup();
    answerAll(Array.from({ length: 25 }, (_, index) => index % 5 !== 0));

    expect(router.state.location.pathname).toBe("/practice/session");
    expect(screen.getByText("Questions answered: 25")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "End Session" }));
    await user.click(screen.getByRole("button", { name: "Yes, finish" }));

    expect(summaryValue("Questions attempted")).toBe("25");
    expect(summaryValue("Correct")).toBe("20");
    expect(summaryValue("Accuracy")).toBe("80%");
    expect(loadStatistics()).toMatchObject({ attempted: 25, correct: 20, incorrect: 5 });
  });
});

describe("generated questions", () => {
  const SAMPLES = 150;

  it("always has four unique choices that include the answer, and never divides by zero", () => {
    for (const operation of MATH_OPERATIONS) {
      for (const level of DIFFICULTY_LEVELS) {
        for (const allowNegativeSubtraction of [false, true]) {
          for (let i = 0; i < SAMPLES; i++) {
            const question = generateQuestion(operation, level, { allowNegativeSubtraction });
            const label = `${operation} level ${level}: ${question.displayText}`;
            expect(validateQuestion(question, { allowNegativeSubtraction }), label).toEqual({
              valid: true,
            });
            expect(new Set(question.choices).size, label).toBe(4);
            expect(question.choices, label).toContain(question.correctAnswer);
            expect(Number.isFinite(question.correctAnswer), label).toBe(true);
            expect(question.displayText, label).not.toMatch(/NaN|Infinity/);
            if (operation === "division") expect(question.secondOperand, label).not.toBe(0);
          }
        }
      }
    }
  });

  it("keeps mixed-operation questions valid", () => {
    for (const level of DIFFICULTY_LEVELS) {
      for (let i = 0; i < SAMPLES; i++) {
        const question = generateQuestionForOperations([...MATH_OPERATIONS], level);
        expect(validateQuestion(question)).toEqual({ valid: true });
        expect(new Set(question.choices).size).toBe(4);
      }
    }
  });

  it("keeps similar questions valid for patterns with a zero operand", () => {
    const zeroPatterns: MistakePattern[] = [
      ["multiplication", 0, 5],
      ["multiplication", 7, 0],
      ["division", 0, 4],
      ["subtraction", 5, 5],
      ["addition", 0, 0],
    ].map(([operation, firstOperand, secondOperand], index) => ({
      id: `zero-${index}`,
      operation: operation as MistakePattern["operation"],
      firstOperand: firstOperand as number,
      secondOperand: secondOperand as number,
      correctAnswer: 0,
      difficulty: 2,
      incorrectCount: 1,
      similarCorrectCount: 0,
      lastIncorrectAt: "2026-03-01T12:00:00.000Z",
      mastered: false,
    }));

    for (const pattern of zeroPatterns) {
      for (let i = 0; i < 50; i++) {
        const question = generateSimilarQuestion(pattern);
        expect(Number.isFinite(question.correctAnswer)).toBe(true);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices).toContain(question.correctAnswer);
        if (question.operation === "division") expect(question.secondOperand).not.toBe(0);
      }
    }
  });
});

describe("very small device widths", () => {
  // jsdom has no layout engine, so a 320px viewport cannot be measured here. These checks catch the
  // usual cause of overflow instead: a fixed width above 320px in the CSS or in inline styles.
  const MAX_FIXED_WIDTH_PX = 320;

  function cssFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return cssFiles(path);
      return entry.name.endsWith(".css") ? [path] : [];
    });
  }

  function toPx(value: number, unit: string): number {
    return unit === "px" ? value : value * 16;
  }

  it("declares no fixed width or min-width above 320px in any stylesheet", () => {
    const offenders: string[] = [];
    for (const file of cssFiles(join(process.cwd(), "src"))) {
      const css = readFileSync(file, "utf8");
      for (const match of css.matchAll(/(?<![-\w])(min-width|width)\s*:\s*([\d.]+)(px|rem)\b/g)) {
        if (toPx(Number(match[2]), match[3]) > MAX_FIXED_WIDTH_PX) {
          offenders.push(`${file}: ${match[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("sets no inline pixel width above 320px on the main pages", async () => {
    localStorage.clear();
    resetStorageServiceState();
    for (const [path, heading] of ROUTES) {
      const { unmount } = renderRoute(path);
      await screen.findByRole("heading", { level: 1, name: heading }, { timeout: 5000 });
      for (const element of document.body.querySelectorAll<HTMLElement>("[style]")) {
        const px = /(?<![-\w])(?:min-)?width:\s*([\d.]+)px/.exec(
          element.getAttribute("style") ?? "",
        );
        if (px) expect(Number(px[1])).toBeLessThanOrEqual(MAX_FIXED_WIDTH_PX);
      }
      unmount();
    }
  });
});
