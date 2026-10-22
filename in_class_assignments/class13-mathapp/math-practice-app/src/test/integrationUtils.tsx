import { act, fireEvent, screen } from "@testing-library/react";
import type { userEvent } from "@testing-library/user-event";
import { loadActiveSession } from "../services/activeSessionStore";
import { answerAndAdvance } from "./practiceTestUtils";

type User = ReturnType<typeof userEvent.setup>;

// Statistics and Settings are lazy routes; loading them needs real I/O, so warm the module cache.
export async function warmLazyRoutes() {
  await import("../pages/StatisticsPage");
  await import("../pages/SettingsPage");
}

export function chooseOperationsMixed() {
  fireEvent.click(screen.getByRole("button", { name: "All operations (mixed)" }));
}

export function chooseSessionLength(label: string) {
  fireEvent.click(screen.getByRole("radio", { name: label }));
}

export function answerAll(results: boolean[]) {
  for (const correct of results) answerAndAdvance(correct);
}

export function summaryValue(term: string): string | null {
  return screen.getByText(term).nextElementSibling?.textContent ?? null;
}

export function currentQuestion() {
  const question = loadActiveSession()?.currentQuestion;
  if (!question) throw new Error("No active question is stored.");
  return question;
}

export async function goTo(router: { navigate: (path: string) => Promise<void> }, path: string) {
  await act(() => router.navigate(path));
}

export async function tabTo(user: User, target: HTMLElement, maxTabs = 60) {
  for (let i = 0; i < maxTabs; i += 1) {
    if (document.activeElement === target) return;
    await user.tab();
  }
  if (document.activeElement !== target) {
    throw new Error(`Tab never reached ${target.textContent}.`);
  }
}
