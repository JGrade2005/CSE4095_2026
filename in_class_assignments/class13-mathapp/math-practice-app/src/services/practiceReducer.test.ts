import { describe, expect, it } from "vitest";
import { initialPracticeState, practiceReducer } from "./practiceReducer";
import type { PracticeAction, PracticeState } from "../types/practice";
import type { Question } from "../types/question";
import type { PracticeSession, SessionConfig } from "../types/session";

const config: SessionConfig = {
  operations: ["addition"],
  difficulty: 1,
  sessionLength: 5,
  mode: "regular",
};

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "session-1",
    startedAt: "2026-03-01T10:00:00.000Z",
    operations: ["addition"],
    difficulty: 1,
    sessionLength: 5,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    ...overrides,
  };
}

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    operation: "addition",
    firstOperand: 3,
    secondOperand: 4,
    displayText: "3 + 4",
    correctAnswer: 7,
    choices: [5, 6, 7, 8],
    difficulty: 1,
    source: "regular",
    ...overrides,
  };
}

function run(actions: PracticeAction[], from: PracticeState = initialPracticeState) {
  return actions.reduce(practiceReducer, from);
}

function start(length: PracticeSession["sessionLength"] = 5, question = makeQuestion()) {
  return practiceReducer(initialPracticeState, {
    type: "START_SESSION",
    config: { ...config, sessionLength: length },
    session: makeSession({ sessionLength: length }),
    question,
  });
}

const flipped: PracticeAction[] = [{ type: "SELECT_ANSWER", answer: 7 }, { type: "FLIP_CARD" }];

describe("START_SESSION", () => {
  it("creates an active session with the first question and clean card state", () => {
    const question = makeQuestion();
    const state = practiceReducer(initialPracticeState, {
      type: "START_SESSION",
      config,
      session: makeSession({ attempted: 9, correct: 9 }),
      question,
    });

    expect(state.status).toBe("active");
    expect(state.config).toEqual(config);
    expect(state.session).toMatchObject({
      id: "session-1",
      startedAt: "2026-03-01T10:00:00.000Z",
      operations: ["addition"],
      difficulty: 1,
      sessionLength: 5,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    });
    expect(state.currentQuestion).toBe(question);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.selectedAnswer).toBeNull();
    expect(state.isCardFlipped).toBe(false);
    expect(state.isResultRecorded).toBe(false);
    expect(state.lastResult).toBeNull();
    expect(state.reviewQuestionsCompleted).toBe(0);
  });

  it("clears the state of a previous session", () => {
    const finished = run(
      [...flipped, { type: "RECORD_RESULT", correct: true, recordedAt: "t" }],
      start(),
    );
    const restarted = practiceReducer(finished, {
      type: "START_SESSION",
      config,
      session: makeSession({ id: "session-2" }),
      question: makeQuestion({ id: "q9" }),
    });
    expect(restarted.session?.id).toBe("session-2");
    expect(restarted.session?.attempted).toBe(0);
    expect(restarted.isResultRecorded).toBe(false);
    expect(restarted.lastResult).toBeNull();
  });
});

describe("SELECT_ANSWER", () => {
  it("stores a choice and allows changing it before the flip", () => {
    const state = run(
      [
        { type: "SELECT_ANSWER", answer: 5 },
        { type: "SELECT_ANSWER", answer: 8 },
      ],
      start(),
    );
    expect(state.selectedAnswer).toBe(8);
  });

  it("is ignored after the card is flipped", () => {
    const state = run([...flipped, { type: "SELECT_ANSWER", answer: 5 }], start());
    expect(state.selectedAnswer).toBe(7);
  });

  it("is ignored for a value that is not one of the choices", () => {
    const state = run([{ type: "SELECT_ANSWER", answer: 99 }], start());
    expect(state.selectedAnswer).toBeNull();
  });

  it("is ignored when no session is active", () => {
    expect(practiceReducer(initialPracticeState, { type: "SELECT_ANSWER", answer: 7 })).toBe(
      initialPracticeState,
    );
  });
});

describe("FLIP_CARD", () => {
  it("is ignored without a selected answer", () => {
    expect(run([{ type: "FLIP_CARD" }], start()).isCardFlipped).toBe(false);
  });

  it("flips once an answer is selected", () => {
    expect(run(flipped, start()).isCardFlipped).toBe(true);
  });
});

describe("RECORD_RESULT", () => {
  it("is ignored before the card is flipped", () => {
    const state = run(
      [
        { type: "SELECT_ANSWER", answer: 7 },
        { type: "RECORD_RESULT", correct: true, recordedAt: "t" },
      ],
      start(),
    );
    expect(state.session?.attempted).toBe(0);
    expect(state.isResultRecorded).toBe(false);
  });

  it("is ignored when nothing is selected", () => {
    const state = run([{ type: "RECORD_RESULT", correct: true, recordedAt: "t" }], start());
    expect(state.session?.attempted).toBe(0);
  });

  it("counts once when dispatched twice", () => {
    const record: PracticeAction = { type: "RECORD_RESULT", correct: false, recordedAt: "t" };
    const state = run([...flipped, record, record], start());
    expect(state.session).toMatchObject({ attempted: 1, correct: 0, incorrect: 1 });
  });

  it("updates totals for a right answer", () => {
    const state = run(
      [...flipped, { type: "RECORD_RESULT", correct: true, recordedAt: "t" }],
      start(),
    );
    expect(state.session).toMatchObject({ attempted: 1, correct: 1, incorrect: 0 });
    expect(state.isResultRecorded).toBe(true);
    expect(state.lastResult).toBe("correct");
  });

  it("updates totals for a wrong answer", () => {
    const state = run(
      [...flipped, { type: "RECORD_RESULT", correct: false, recordedAt: "t" }],
      start(),
    );
    expect(state.session).toMatchObject({ attempted: 1, correct: 0, incorrect: 1 });
    expect(state.lastResult).toBe("incorrect");
  });

  it("counts review questions but not regular ones", () => {
    const record: PracticeAction = { type: "RECORD_RESULT", correct: true, recordedAt: "t" };
    const regular = run([...flipped, record], start());
    expect(regular.reviewQuestionsCompleted).toBe(0);

    const review = run(
      [...flipped, record],
      start(5, makeQuestion({ source: "mistake-review", mistakePatternId: "p1" })),
    );
    expect(review.reviewQuestionsCompleted).toBe(1);
  });
});

describe("NEXT_QUESTION", () => {
  it("is ignored before the result is recorded", () => {
    const before = run(flipped, start());
    const after = practiceReducer(before, {
      type: "NEXT_QUESTION",
      question: makeQuestion({ id: "q2" }),
    });
    expect(after).toBe(before);
  });

  it("moves on and resets selection, flip and recorded state", () => {
    const next = makeQuestion({ id: "q2", displayText: "2 + 2" });
    const state = run(
      [
        ...flipped,
        { type: "RECORD_RESULT", correct: true, recordedAt: "t" },
        { type: "NEXT_QUESTION", question: next },
      ],
      start(),
    );
    expect(state.currentQuestion).toBe(next);
    expect(state.currentQuestionIndex).toBe(1);
    expect(state.selectedAnswer).toBeNull();
    expect(state.isCardFlipped).toBe(false);
    expect(state.isResultRecorded).toBe(false);
    expect(state.lastResult).toBeNull();
    expect(state.session?.attempted).toBe(1);
  });
});

describe("session completion", () => {
  it("completes a fixed session when attempted reaches its length", () => {
    const state = run(
      [
        ...flipped,
        { type: "RECORD_RESULT", correct: true, recordedAt: "t1" },
        { type: "NEXT_QUESTION", question: makeQuestion({ id: "q2" }) },
        ...flipped,
        { type: "RECORD_RESULT", correct: false, recordedAt: "t2" },
      ],
      start(2),
    );
    expect(state.status).toBe("complete");
    expect(state.session?.completedAt).toBe("t2");
    expect(state.session).toMatchObject({ attempted: 2, correct: 1, incorrect: 1 });
  });

  it("stays active before the last question", () => {
    const state = run(
      [...flipped, { type: "RECORD_RESULT", correct: true, recordedAt: "t" }],
      start(2),
    );
    expect(state.status).toBe("active");
    expect(state.session?.completedAt).toBeUndefined();
  });

  it("ignores further actions once complete", () => {
    const done = run(
      [...flipped, { type: "RECORD_RESULT", correct: true, recordedAt: "t" }],
      start(1),
    );
    const after = practiceReducer(done, {
      type: "NEXT_QUESTION",
      question: makeQuestion({ id: "q2" }),
    });
    expect(after).toBe(done);
  });

  it("never completes a continuous session until END_SESSION", () => {
    let state = start("continuous");
    for (let index = 0; index < 30; index++) {
      state = run(
        [
          ...flipped,
          { type: "RECORD_RESULT", correct: true, recordedAt: "t" },
          { type: "NEXT_QUESTION", question: makeQuestion({ id: `q${index}` }) },
        ],
        state,
      );
    }
    expect(state.status).toBe("active");
    expect(state.session?.attempted).toBe(30);

    const ended = practiceReducer(state, { type: "END_SESSION", endedAt: "end" });
    expect(ended.status).toBe("complete");
    expect(ended.session?.completedAt).toBe("end");
  });

  it("END_SESSION with a flipped unrecorded card changes no totals", () => {
    const ended = run([...flipped, { type: "END_SESSION", endedAt: "end" }], start());
    expect(ended.status).toBe("complete");
    expect(ended.session).toMatchObject({
      attempted: 0,
      correct: 0,
      incorrect: 0,
      completedAt: "end",
    });
    expect(ended.isResultRecorded).toBe(false);
  });

  it("END_SESSION is ignored when idle", () => {
    expect(practiceReducer(initialPracticeState, { type: "END_SESSION", endedAt: "end" })).toBe(
      initialPracticeState,
    );
  });
});
