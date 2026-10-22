import type { PracticeAction, PracticeState } from "../types/practice";

export const initialPracticeState: PracticeState = {
  status: "idle",
  config: null,
  session: null,
  currentQuestion: null,
  currentQuestionIndex: 0,
  selectedAnswer: null,
  isCardFlipped: false,
  isResultRecorded: false,
  lastResult: null,
  reviewQuestionsCompleted: 0,
};

// Spec 18: a result counts only after an answer is picked and the card is flipped, and only once.
export function canRecordResult(state: PracticeState): boolean {
  return (
    state.status === "active" &&
    state.currentQuestion !== null &&
    state.selectedAnswer !== null &&
    state.isCardFlipped &&
    !state.isResultRecorded
  );
}

function startSession(action: Extract<PracticeAction, { type: "START_SESSION" }>): PracticeState {
  return {
    ...initialPracticeState,
    status: "active",
    config: action.config,
    session: { ...action.session, attempted: 0, correct: 0, incorrect: 0 },
    currentQuestion: action.question,
  };
}

function recordResult(
  state: PracticeState,
  action: Extract<PracticeAction, { type: "RECORD_RESULT" }>,
): PracticeState {
  if (!canRecordResult(state) || !state.session || !state.currentQuestion) return state;

  const attempted = state.session.attempted + 1;
  const isComplete =
    typeof state.session.sessionLength === "number" && attempted >= state.session.sessionLength;
  const session = {
    ...state.session,
    attempted,
    correct: state.session.correct + (action.correct ? 1 : 0),
    incorrect: state.session.incorrect + (action.correct ? 0 : 1),
    ...(isComplete ? { completedAt: action.recordedAt } : {}),
  };
  const isReview = state.currentQuestion.source === "mistake-review";

  return {
    ...state,
    status: isComplete ? "complete" : state.status,
    session,
    isResultRecorded: true,
    lastResult: action.correct ? "correct" : "incorrect",
    reviewQuestionsCompleted: state.reviewQuestionsCompleted + (isReview ? 1 : 0),
  };
}

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case "START_SESSION":
      return startSession(action);

    case "SELECT_ANSWER":
      if (
        state.status !== "active" ||
        state.isCardFlipped ||
        !state.currentQuestion?.choices.includes(action.answer)
      ) {
        return state;
      }
      return { ...state, selectedAnswer: action.answer };

    case "FLIP_CARD":
      if (state.status !== "active" || state.selectedAnswer === null || state.isCardFlipped) {
        return state;
      }
      return { ...state, isCardFlipped: true };

    case "RECORD_RESULT":
      return recordResult(state, action);

    case "NEXT_QUESTION":
      if (state.status !== "active" || !state.isResultRecorded) return state;
      return {
        ...state,
        currentQuestion: action.question,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        selectedAnswer: null,
        isCardFlipped: false,
        isResultRecorded: false,
        lastResult: null,
      };

    case "END_SESSION":
      if (state.status !== "active" || !state.session) return state;
      return {
        ...state,
        status: "complete",
        session: { ...state.session, completedAt: action.endedAt },
      };
  }
}
