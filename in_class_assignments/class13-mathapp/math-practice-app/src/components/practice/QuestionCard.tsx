import { useEffect, useRef } from "react";
import type { Question } from "../../types/question";
import { speakNumber } from "../../utils/spokenMath";
import CardBack from "./CardBack";
import CardFront from "./CardFront";
import styles from "./QuestionCard.module.css";

export interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number | null;
  selectedAnswer: number | null;
  isFlipped: boolean;
  resultRecorded: boolean;
  explanation: string | null;
  animate: boolean;
  onSelect: (value: number) => void;
  onFlip: () => void;
  onResult: (correct: boolean) => void;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  isFlipped,
  resultRecorded,
  explanation,
  animate,
  onSelect,
  onFlip,
  onResult,
}: QuestionCardProps) {
  const frontHeadingRef = useRef<HTMLHeadingElement>(null);
  const backHeadingRef = useRef<HTMLHeadingElement>(null);
  const previous = useRef({ id: question.id, flipped: isFlipped });

  // Focus is left alone on first mount so the page can decide where keyboard users start.
  useEffect(() => {
    const { id, flipped } = previous.current;
    if (question.id !== id) {
      frontHeadingRef.current?.focus();
    } else if (isFlipped && !flipped) {
      backHeadingRef.current?.focus();
    }
    previous.current = { id: question.id, flipped: isFlipped };
  }, [question.id, isFlipped]);

  const front = (
    <CardFront
      question={question}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      selectedAnswer={selectedAnswer}
      disabled={isFlipped}
      onSelect={onSelect}
      onFlip={onFlip}
      headingRef={frontHeadingRef}
    />
  );

  const back =
    selectedAnswer === null ? null : (
      <CardBack
        question={question}
        selectedAnswer={selectedAnswer}
        explanation={explanation}
        resultRecorded={resultRecorded}
        onResult={onResult}
        headingRef={backHeadingRef}
      />
    );

  const announcement =
    isFlipped && selectedAnswer !== null
      ? `The answer is ${speakNumber(question.correctAnswer)}. You picked ${speakNumber(selectedAnswer)}.`
      : "";

  return (
    <div className={styles.card}>
      <div role="status" className={styles.visuallyHidden}>
        {announcement}
      </div>
      {animate ? (
        <div className={styles.scene}>
          <div className={`${styles.inner} ${isFlipped ? styles.flipped : ""}`}>
            <div
              className={`${styles.face} ${styles.frontFace}`}
              aria-hidden={isFlipped ? true : undefined}
              inert={isFlipped}
            >
              {front}
            </div>
            <div
              className={`${styles.face} ${styles.backFace}`}
              aria-hidden={isFlipped ? undefined : true}
              inert={!isFlipped}
            >
              {back}
            </div>
          </div>
        </div>
      ) : isFlipped ? (
        <div className={styles.face}>{back}</div>
      ) : (
        <div className={styles.face}>{front}</div>
      )}
    </div>
  );
}
