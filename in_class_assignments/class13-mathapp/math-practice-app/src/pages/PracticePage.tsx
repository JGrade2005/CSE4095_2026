import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import type { BlockerFunction } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";
import FeedbackMessage from "../components/practice/FeedbackMessage";
import ProgressBar from "../components/practice/ProgressBar";
import QuestionCard from "../components/practice/QuestionCard";
import { usePracticeSession } from "../hooks/usePracticeSession";
import { useSettings } from "../hooks/useSettings";
import { explainQuestion } from "../services/explanations";
import styles from "./PracticePage.module.css";

export const NEXT_QUESTION_DELAY_MS = 700;
export const NEXT_QUESTION_FAST_DELAY_MS = 250;

export default function PracticePage() {
  const { settings } = useSettings();
  const { state, selectAnswer, flipCard, recordResult, nextQuestion, endSession } =
    usePracticeSession();
  const navigate = useNavigate();
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const leavingRef = useRef(false);

  const { status, isResultRecorded, currentQuestion } = state;
  const animate = settings.cardAnimationEnabled;
  const showExplanations = settings.showExplanations;

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      status === "active" && currentLocation.pathname !== nextLocation.pathname,
    [status],
  );
  const blocker = useBlocker(shouldBlock);

  // Declared after useBlocker so its effect re-registers the blocker for the new status first.
  useEffect(() => {
    if (status === "complete" && !leavingRef.current) {
      navigate(paths.practiceSummary, { replace: true });
    }
  }, [status, navigate]);

  const explanation = useMemo(
    () => (showExplanations && currentQuestion ? explainQuestion(currentQuestion) : null),
    [showExplanations, currentQuestion],
  );

  useEffect(() => {
    if (status !== "active" || !isResultRecorded) return;
    const timer = setTimeout(
      nextQuestion,
      animate ? NEXT_QUESTION_DELAY_MS : NEXT_QUESTION_FAST_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [status, isResultRecorded, animate, nextQuestion]);

  const { session } = state;
  if (status === "idle" || !session || !currentQuestion) {
    return (
      <>
        <h1>Practice</h1>
        <EmptyState
          title="No practice session is running."
          message="Pick what you want to practice and start a new session."
          action={
            <div className={styles.emptyActions}>
              <Button size="large" onClick={() => navigate(paths.practiceSetup)}>
                Set Up Practice
              </Button>
              <Button variant="secondary" size="large" onClick={() => navigate(paths.home)}>
                Return Home
              </Button>
            </div>
          }
        />
      </>
    );
  }
  if (status === "complete") return null;

  const total = session.sessionLength === "continuous" ? null : session.sessionLength;
  const answered = session.attempted;

  return (
    <>
      <h1>Practice</h1>
      {total === null ? (
        <p className={styles.count}>Questions answered: {answered}</p>
      ) : (
        <div className={styles.progress}>
          <ProgressBar completed={answered} total={total} />
        </div>
      )}
      <QuestionCard
        question={currentQuestion}
        questionNumber={state.currentQuestionIndex + 1}
        totalQuestions={total}
        selectedAnswer={state.selectedAnswer}
        isFlipped={state.isCardFlipped}
        resultRecorded={isResultRecorded}
        explanation={explanation}
        animate={animate}
        onSelect={selectAnswer}
        onFlip={flipCard}
        onResult={recordResult}
      />
      <FeedbackMessage
        result={state.lastResult}
        attemptNumber={answered}
        enabled={settings.feedbackMessagesEnabled}
      />
      {total === null && (
        <div className={styles.actions}>
          <Button variant="secondary" size="large" onClick={() => setConfirmingEnd(true)}>
            End Session
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmingEnd}
        title="End this session?"
        message={`You answered ${answered} ${answered === 1 ? "question" : "questions"}. Do you want to finish and see your summary?`}
        confirmLabel="Yes, finish"
        cancelLabel="Keep practicing"
        onCancel={() => setConfirmingEnd(false)}
        onConfirm={() => {
          setConfirmingEnd(false);
          // The "complete" status redirects to the summary on the next render.
          endSession();
        }}
      />
      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Leave practice?"
        message="Your session is still going. If you leave now, it will end and your answers so far are saved."
        confirmLabel="Leave and end session"
        cancelLabel="Keep practicing"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => {
          // Leaving first and ending second keeps the page's own redirect to the summary out of the way.
          leavingRef.current = true;
          blocker.proceed?.();
          endSession();
        }}
      />
    </>
  );
}
