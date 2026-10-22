import type { PracticeResult } from "../types/practice";

export const CORRECT_MESSAGES: readonly string[] = [
  "Great job!",
  "Nice work!",
  "You got it!",
  "Super!",
  "Awesome!",
  "Well done!",
];

export const SUPPORTIVE_MESSAGES: readonly string[] = [
  "Keep practicing!",
  "You are improving!",
  "Nice try, you'll get the next one!",
  "Mistakes help us learn!",
  "Every try makes you stronger!",
];

export function pickFeedbackMessage(
  result: PracticeResult,
  previous?: string | null,
  random: () => number = Math.random,
): string {
  const pool = result === "correct" ? CORRECT_MESSAGES : SUPPORTIVE_MESSAGES;
  const options = pool.filter((message) => message !== previous);
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
}
