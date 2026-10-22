import { useState } from "react";
import { pickFeedbackMessage } from "../../services/feedbackMessages";
import type { PracticeResult } from "../../types/practice";
import styles from "./FeedbackMessage.module.css";

export interface FeedbackMessageProps {
  result: PracticeResult | null;
  attemptNumber: number;
  enabled: boolean;
}

interface Shown {
  attemptNumber: number;
  result: PracticeResult;
  message: string;
}

const ICONS: Record<PracticeResult, string> = { correct: "★", incorrect: "♥" };

export default function FeedbackMessage({ result, attemptNumber, enabled }: FeedbackMessageProps) {
  const [shown, setShown] = useState<Shown | null>(null);

  // The engine clears lastResult when the next question appears, so the last message is kept.
  if (result !== null && (shown === null || shown.attemptNumber !== attemptNumber)) {
    setShown({
      attemptNumber,
      result,
      message: pickFeedbackMessage(result, shown?.message),
    });
  }

  if (!enabled) return null;

  return (
    <div className={styles.slot}>
      {shown && (
        <p
          key={shown.attemptNumber}
          role="status"
          className={
            shown.result === "correct" ? styles.message : `${styles.message} ${styles.supportive}`
          }
        >
          <span aria-hidden="true" className={styles.icon}>
            {ICONS[shown.result]}
          </span>
          {shown.message}
        </p>
      )}
    </div>
  );
}
