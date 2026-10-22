import type { Ref } from "react";
import type { Question } from "../../types/question";
import { OPERATION_SYMBOLS } from "../../utils/math";
import { speakEquation } from "../../utils/spokenMath";
import Button from "../common/Button";
import styles from "./CardBack.module.css";

export interface CardBackProps {
  question: Question;
  selectedAnswer: number;
  explanation: string | null;
  resultRecorded: boolean;
  onResult: (correct: boolean) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

function formatNumber(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

export default function CardBack({
  question,
  selectedAnswer,
  explanation,
  resultRecorded,
  onResult,
  headingRef,
}: CardBackProps) {
  const equation = `${formatNumber(question.firstOperand)} ${OPERATION_SYMBOLS[question.operation]} ${formatNumber(question.secondOperand)} = ${formatNumber(question.correctAnswer)}`;

  return (
    <div className={styles.back}>
      <h2 ref={headingRef} tabIndex={-1} className={styles.heading}>
        Here is the answer
      </h2>
      <p className={styles.original}>Question: {question.displayText}</p>
      <p className={styles.equation}>
        <span aria-hidden="true">{equation}</span>
        <span className={styles.visuallyHidden}>{speakEquation(question)}</span>
      </p>
      <p className={styles.yours}>Your answer: {formatNumber(selectedAnswer)}</p>
      {explanation !== null && <p className={styles.explanation}>{explanation}</p>}
      <div className={styles.actions}>
        <Button size="large" disabled={resultRecorded} onClick={() => onResult(true)}>
          I Got It Right
        </Button>
        <Button
          size="large"
          variant="secondary"
          disabled={resultRecorded}
          onClick={() => onResult(false)}
        >
          I Got It Wrong
        </Button>
      </div>
    </div>
  );
}
