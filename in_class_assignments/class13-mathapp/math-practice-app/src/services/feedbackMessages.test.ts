import { CORRECT_MESSAGES, SUPPORTIVE_MESSAGES, pickFeedbackMessage } from "./feedbackMessages";

const SHAMING = /\b(stupid|dumb|bad|wrong|fail(ed|ure)?|loser|idiot|terrible)\b/i;

describe("feedback messages", () => {
  it("gives right answers a positive message", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(CORRECT_MESSAGES).toContain(pickFeedbackMessage("correct"));
    }
  });

  it("gives wrong answers a supportive message", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(SUPPORTIVE_MESSAGES).toContain(pickFeedbackMessage("incorrect"));
    }
  });

  it("never uses shaming words", () => {
    for (const message of [...CORRECT_MESSAGES, ...SUPPORTIVE_MESSAGES]) {
      expect(message).not.toMatch(SHAMING);
    }
  });

  it("has enough messages to vary", () => {
    expect(CORRECT_MESSAGES.length).toBeGreaterThanOrEqual(4);
    expect(SUPPORTIVE_MESSAGES.length).toBeGreaterThanOrEqual(4);
  });

  it("never repeats the previous message over 100 picks", () => {
    for (const result of ["correct", "incorrect"] as const) {
      let previous: string | undefined;
      const seen = new Set<string>();
      for (let i = 0; i < 100; i += 1) {
        const message = pickFeedbackMessage(result, previous);
        expect(message).not.toBe(previous);
        seen.add(message);
        previous = message;
      }
      expect(seen.size).toBeGreaterThan(1);
    }
  });

  it("copes with the random source returning its extremes", () => {
    expect(pickFeedbackMessage("correct", null, () => 0)).toBe(CORRECT_MESSAGES[0]);
    expect(pickFeedbackMessage("correct", null, () => 0.999999)).toBe(
      CORRECT_MESSAGES[CORRECT_MESSAGES.length - 1],
    );
  });
});
