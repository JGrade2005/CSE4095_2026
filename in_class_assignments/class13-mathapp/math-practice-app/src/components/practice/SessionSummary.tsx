import type { CSSProperties, ReactNode } from "react";
import { calculateAccuracy } from "../../services/statisticsService";
import type { PracticeSession } from "../../types/session";
import { OPERATION_LABELS, formatDifficulty, formatSessionLength } from "../../utils/labels";
import OperationBadge from "../common/OperationBadge";
import styles from "./SessionSummary.module.css";

export interface SessionSummaryProps {
  session: PracticeSession;
  reviewQuestionsCompleted: number;
}

const BURST_PIECES = Array.from({ length: 12 }, (_, index) => index);

type Tone = "correct" | "incorrect" | "accuracy" | "plain";

interface Row {
  term: string;
  value: ReactNode;
  tone: Tone;
}

function getEncouragement(attempted: number, accuracy: number): string {
  if (attempted === 0) return "Good try! Come back and practice again soon.";
  if (accuracy >= 80) return "Amazing work!";
  if (accuracy >= 50) return "Nice work!";
  return "Keep practicing, you are improving!";
}

export default function SessionSummary({ session, reviewQuestionsCompleted }: SessionSummaryProps) {
  const accuracy = calculateAccuracy(session.correct, session.attempted);
  const rows: Row[] = [
    { term: "Questions attempted", value: String(session.attempted), tone: "plain" },
    { term: "Correct", value: String(session.correct), tone: "correct" },
    { term: "Incorrect", value: String(session.incorrect), tone: "incorrect" },
    { term: "Accuracy", value: `${accuracy}%`, tone: "accuracy" },
    {
      term: "Operations practiced",
      value: (
        <>
          <span>{session.operations.map((item) => OPERATION_LABELS[item]).join(", ")}</span>
          <span className={styles.badges}>
            {session.operations.map((item) => (
              <OperationBadge key={item} operation={item} size="sm" />
            ))}
          </span>
        </>
      ),
      tone: "plain",
    },
    { term: "Difficulty", value: formatDifficulty(session.difficulty), tone: "plain" },
    { term: "Session length", value: formatSessionLength(session.sessionLength), tone: "plain" },
    { term: "Mistake-review questions", value: String(reviewQuestionsCompleted), tone: "plain" },
  ];

  return (
    <section className={styles.summary} aria-labelledby="session-summary-heading">
      <div className={styles.hero} aria-hidden="true">
        <div className={styles.burst}>
          {BURST_PIECES.map((index) => (
            <span
              key={index}
              className={styles.piece}
              style={{ "--angle": `${index * 30}deg` } as CSSProperties}
            />
          ))}
        </div>
        <div className={styles.starWrap}>
          <div className={styles.star} />
        </div>
      </div>
      <p className={styles.message}>{getEncouragement(session.attempted, accuracy)}</p>
      <h2 id="session-summary-heading" className={styles.heading}>
        Your results
      </h2>
      <dl className={styles.list}>
        {rows.map(({ term, value, tone }) => (
          <div key={term} className={`${styles.item} ${styles[tone]}`}>
            <dt className={styles.term}>{term}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
