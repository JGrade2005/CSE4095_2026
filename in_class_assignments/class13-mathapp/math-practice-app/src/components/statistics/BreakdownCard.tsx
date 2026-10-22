import { calculateAccuracy } from "../../services/statisticsService";
import type { OperationStatistics } from "../../types/statistics";
import styles from "./Statistics.module.css";

interface BreakdownCardProps {
  title: string;
  counts: OperationStatistics;
}

export default function BreakdownCard({ title, counts }: BreakdownCardProps) {
  const accuracy = calculateAccuracy(counts.correct, counts.attempted);
  return (
    <li className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
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
