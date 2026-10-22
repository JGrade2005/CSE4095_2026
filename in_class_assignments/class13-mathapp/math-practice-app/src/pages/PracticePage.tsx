import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
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
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const { status, isResultRecorded } = state;
  const animate = settings.cardAnimationEnabled;

  useEffect(() => {
    if (status !== "active" || !isResultRecorded) return;
    const timer = setTimeout(
      nextQuestion,
      animate ? NEXT_QUESTION_DELAY_MS : NEXT_QUESTION_FAST_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [status, isResultRecorded, animate, nextQuestion]);

  const { session, currentQuestion } = state;
  if (status === "idle" || !session || !currentQuestion) {
    return <Navigate to={paths.practiceSetup} replace />;
  }
  if (status === "complete") {
    return <Navigate to={paths.practiceSummary} replace />;
  }

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
        explanation={settings.showExplanations ? explainQuestion(currentQuestion) : null}
        animate={animate}
        onSelect={selectAnswer}
        onFlip={flipCard}
        onResult={recordResult}
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
    </>
  );
}
