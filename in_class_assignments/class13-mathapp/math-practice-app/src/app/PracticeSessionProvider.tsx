import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSettings } from "../hooks/useSettings";
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
} from "../services/activeSessionStore";
import { applyReviewResult } from "../services/mastery";
import { recordIncorrectAnswer } from "../services/mistakeService";
import {
  canRecordResult,
  initialPracticeState,
  practiceReducer,
} from "../services/practiceReducer";
import {
  appendAttempt,
  loadMistakePatterns,
  loadStatistics,
  saveMistakePatterns,
  saveSession,
  saveStatistics,
} from "../services/practiceRecords";
import { generateQuestionForOperations } from "../services/questionGenerator";
import { buildReviewQuestion, getReviewablePatterns } from "../services/reviewSessionBuilder";
import { playResultSound } from "../services/sound";
import { applyAttemptToStatistics } from "../services/statisticsService";
import type { PracticeAction, PracticeSessionApi, PracticeState } from "../types/practice";
import type { DifficultyLevel, MathOperation, Question } from "../types/question";
import type { PracticeAttempt, PracticeSession, SessionConfig } from "../types/session";
import { createId } from "../utils/ids";
import { PracticeSessionContext } from "./practiceSessionContext";

const MAX_REPEAT_RETRIES = 10;

function loadInitialState(): PracticeState {
  return loadActiveSession() ?? initialPracticeState;
}

// Only an in-progress session is worth restoring after a refresh.
function persistActiveSession(state: PracticeState): void {
  if (state.status === "active") saveActiveSession(state);
  else clearActiveSession();
}

function isSameQuestion(a: Question, b: Question | null): boolean {
  return (
    b !== null &&
    a.operation === b.operation &&
    a.firstOperand === b.firstOperand &&
    a.secondOperand === b.secondOperand
  );
}

function buildAttempt(
  question: Question,
  session: PracticeSession,
  selectedAnswer: number,
  correct: boolean,
  attemptedAt: string,
): PracticeAttempt {
  return {
    id: createId(),
    questionId: question.id,
    operation: question.operation,
    firstOperand: question.firstOperand,
    secondOperand: question.secondOperand,
    correctAnswer: question.correctAnswer,
    selectedAnswer,
    selfReportedCorrect: correct,
    difficulty: question.difficulty,
    source: question.source,
    ...(question.mistakePatternId ? { mistakePatternId: question.mistakePatternId } : {}),
    attemptedAt,
    sessionId: session.id,
  };
}

export default function PracticeSessionProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [initialState] = useState(loadInitialState);
  const [state, rawDispatch] = useReducer(practiceReducer, initialState);
  // The ref updates synchronously so a second call in the same tick sees the first one's result.
  const stateRef = useRef<PracticeState>(initialState);

  const dispatch = useCallback((action: PracticeAction): PracticeState => {
    const next = practiceReducer(stateRef.current, action);
    if (next !== stateRef.current) persistActiveSession(next);
    stateRef.current = next;
    rawDispatch(action);
    return stateRef.current;
  }, []);

  const { allowNegativeSubtraction, masteryThreshold, soundEffectsEnabled } = settings;

  const nextQuestionFor = useCallback(
    (config: SessionConfig, previous: Question | null): Question => {
      const options = { allowNegativeSubtraction };
      const generate = (): Question => {
        if (config.mode === "mistake-review") {
          const review = buildReviewQuestion(
            loadMistakePatterns(),
            config,
            new Date(),
            masteryThreshold,
            options,
            previous?.mistakePatternId,
          );
          if (review) return review;
        }
        return generateQuestionForOperations(config.operations, config.difficulty, options);
      };

      let question = generate();
      for (
        let retry = 0;
        retry < MAX_REPEAT_RETRIES && isSameQuestion(question, previous);
        retry++
      ) {
        question = generate();
      }
      return question;
    },
    [allowNegativeSubtraction, masteryThreshold],
  );

  const startSession = useCallback(
    (config: SessionConfig) => {
      const session: PracticeSession = {
        id: createId(),
        startedAt: new Date().toISOString(),
        operations: config.operations,
        difficulty: config.difficulty,
        sessionLength: config.sessionLength,
        attempted: 0,
        correct: 0,
        incorrect: 0,
      };
      const next = dispatch({
        type: "START_SESSION",
        config,
        session,
        question: nextQuestionFor(config, null),
      });
      if (next.session) saveSession(next.session);
    },
    [dispatch, nextQuestionFor],
  );

  const selectAnswer = useCallback(
    (answer: number) => {
      dispatch({ type: "SELECT_ANSWER", answer });
    },
    [dispatch],
  );

  const flipCard = useCallback(() => {
    dispatch({ type: "FLIP_CARD" });
  }, [dispatch]);

  const updateMistakePatterns = useCallback(
    (question: Question, correct: boolean, now: Date) => {
      let patterns = loadMistakePatterns();
      const isReview = question.source === "mistake-review" && question.mistakePatternId;
      if (isReview) {
        patterns = patterns.map((pattern) =>
          pattern.id === question.mistakePatternId
            ? applyReviewResult(pattern, correct, masteryThreshold)
            : pattern,
        );
      }
      if (!correct) {
        patterns = recordIncorrectAnswer(
          patterns,
          {
            operation: question.operation,
            firstOperand: question.firstOperand,
            secondOperand: question.secondOperand,
            correctAnswer: question.correctAnswer,
            difficulty: question.difficulty,
          },
          now,
        );
      }
      if (isReview || !correct) saveMistakePatterns(patterns);
    },
    [masteryThreshold],
  );

  const recordResult = useCallback(
    (correct: boolean) => {
      const current = stateRef.current;
      const { currentQuestion, selectedAnswer, session } = current;
      if (!canRecordResult(current) || !currentQuestion || selectedAnswer === null || !session) {
        return;
      }

      const now = new Date();
      const attempt = buildAttempt(
        currentQuestion,
        session,
        selectedAnswer,
        correct,
        now.toISOString(),
      );
      appendAttempt(attempt);
      saveStatistics(applyAttemptToStatistics(loadStatistics(), attempt));
      updateMistakePatterns(currentQuestion, correct, now);

      const next = dispatch({ type: "RECORD_RESULT", correct, recordedAt: now.toISOString() });
      if (next.session) saveSession(next.session);
      if (soundEffectsEnabled) playResultSound(correct);
    },
    [dispatch, soundEffectsEnabled, updateMistakePatterns],
  );

  const nextQuestion = useCallback(() => {
    const { status, isResultRecorded, config, currentQuestion } = stateRef.current;
    if (status !== "active" || !isResultRecorded || !config) return;
    dispatch({ type: "NEXT_QUESTION", question: nextQuestionFor(config, currentQuestion) });
  }, [dispatch, nextQuestionFor]);

  const endSession = useCallback(() => {
    if (stateRef.current.status !== "active") return;
    const next = dispatch({ type: "END_SESSION", endedAt: new Date().toISOString() });
    if (next.session) saveSession(next.session);
  }, [dispatch]);

  const getReviewableCount = useCallback(
    (operations: MathOperation[], difficulty: DifficultyLevel) =>
      getReviewablePatterns(loadMistakePatterns(), operations, difficulty).length,
    [],
  );

  const value = useMemo<PracticeSessionApi>(
    () => ({
      state,
      startSession,
      selectAnswer,
      flipCard,
      recordResult,
      nextQuestion,
      endSession,
      getReviewableCount,
    }),
    [
      state,
      startSession,
      selectAnswer,
      flipCard,
      recordResult,
      nextQuestion,
      endSession,
      getReviewableCount,
    ],
  );

  return <PracticeSessionContext value={value}>{children}</PracticeSessionContext>;
}
