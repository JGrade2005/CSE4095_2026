import { calculateAccuracy } from "../../services/statisticsService";
import type { PracticeSession } from "../../types/session";
import { OPERATION_LABELS, formatDifficulty, formatSessionLength } from "../../utils/labels";
import styles from "./SessionSummary.module.css";

export interface SessionSummaryProps {
  session: PracticeSession;
  reviewQuestionsCompleted: number;
}

function getEncouragement(attempted: number, accuracy: number): string {
  if (attempted === 0) return "Good try! Come back and practice again soon.";
  if (accuracy >= 80) return "Amazing work!";
  if (accuracy >= 50) return "Nice work!";
  return "Keep practicing, you are improving!";
}

export default function SessionSummary({ session, reviewQuestionsCompleted }: SessionSummaryProps) {
  const accuracy = calculateAccuracy(session.correct, session.attempted);
  const rows: Array<[string, string]> = [
    ["Questions attempted", String(session.attempted)],
    ["Correct", String(session.correct)],
    ["Incorrect", String(session.incorrect)],
    ["Accuracy", `${accuracy}%`],
    ["Operations practiced", session.operations.map((item) => OPERATION_LABELS[item]).join(", ")],
    ["Difficulty", formatDifficulty(session.difficulty)],
    ["Session length", formatSessionLength(session.sessionLength)],
    ["Mistake-review questions", String(reviewQuestionsCompleted)],
  ];

  return (
    <section className={styles.summary} aria-labelledby="session-summary-heading">
      <p className={styles.message}>{getEncouragement(session.attempted, accuracy)}</p>
      <h2 id="session-summary-heading" className={styles.heading}>
        Your results
      </h2>
      <dl className={styles.list}>
        {rows.map(([term, value]) => (
          <div key={term} className={styles.item}>
            <dt className={styles.term}>{term}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
