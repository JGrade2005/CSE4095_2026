import { calculateAccuracy } from "../../services/statisticsService";
import type { DifficultyLevel, MathOperation } from "../../types/question";
import type { OperationStatistics } from "../../types/statistics";
import OperationBadge from "../common/OperationBadge";
import styles from "./Statistics.module.css";

interface BreakdownCardProps {
  title: string;
  counts: OperationStatistics;
  operation?: MathOperation;
  level?: DifficultyLevel;
}

export default function BreakdownCard({ title, counts, operation, level }: BreakdownCardProps) {
  const accuracy = calculateAccuracy(counts.correct, counts.attempted);
  return (
    <li className={`${styles.card} ${operation ? styles[operation] : ""}`}>
      <div className={styles.cardHeader}>
        {operation && <OperationBadge operation={operation} size="md" />}
        <h3 className={styles.cardTitle}>{title}</h3>
      </div>
      {level !== undefined && (
        <span className={styles.stars} aria-hidden="true">
          {"★".repeat(level)}
        </span>
      )}
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Attempted</dt>
          <dd>{counts.attempted}</dd>
        </div>
        <div className={styles.row}>
          <dt>Correct</dt>
          <dd>{counts.correct}</dd>
        </div>
        <div className={styles.row}>
          <dt>Incorrect</dt>
          <dd>{counts.incorrect}</dd>
        </div>
        <div className={`${styles.row} ${styles.accuracy}`}>
          <dt>Accuracy</dt>
          <dd>{accuracy}%</dd>
        </div>
      </dl>
    </li>
  );
}
