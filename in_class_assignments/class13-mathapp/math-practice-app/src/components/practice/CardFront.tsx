import type { Ref } from "react";
import type { Question } from "../../types/question";
import { speakQuestion } from "../../utils/spokenMath";
import Button from "../common/Button";
import AnswerChoice from "./AnswerChoice";
import styles from "./CardFront.module.css";

export interface CardFrontProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number | null;
  selectedAnswer: number | null;
  disabled: boolean;
  onSelect: (value: number) => void;
  onFlip: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

export default function CardFront({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  disabled,
  onSelect,
  onFlip,
  headingRef,
}: CardFrontProps) {
  return (
    <div className={styles.front}>
      <p className={styles.counter}>
        {totalQuestions === null
          ? `Question ${questionNumber}`
          : `Question ${questionNumber} of ${totalQuestions}`}
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className={styles.question}
        aria-label={speakQuestion(question)}
      >
        {question.displayText}
      </h2>
      <div role="group" aria-label="Answer choices" className={styles.choices}>
        {question.choices.map((choice, index) => (
          <AnswerChoice
            key={choice}
            value={choice}
            shortcut={index + 1}
            selected={choice === selectedAnswer}
            disabled={disabled}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p className={styles.hint}>Tip: press 1, 2, 3 or 4 to pick an answer.</p>
      <Button size="large" onClick={onFlip} disabled={disabled || selectedAnswer === null}>
        Flip Card
      </Button>
    </div>
  );
}
