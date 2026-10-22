import { MATH_OPERATIONS } from "../../types/question";
import type { AppStatistics } from "../../types/statistics";
import { OPERATION_LABELS } from "../../utils/labels";
import BreakdownCard from "./BreakdownCard";
import styles from "./Statistics.module.css";

interface OperationStatisticsProps {
  byOperation: AppStatistics["byOperation"];
}

export default function OperationStatistics({ byOperation }: OperationStatisticsProps) {
  return (
    <section className={styles.section} aria-labelledby="operation-heading">
      <h2 id="operation-heading" className={styles.heading}>
        Results by operation
      </h2>
      <ul className={styles.cardGrid}>
        {MATH_OPERATIONS.map((operation) => (
          <BreakdownCard
            key={operation}
            title={OPERATION_LABELS[operation]}
            counts={byOperation[operation]}
          />
        ))}
      </ul>
    </section>
  );
}
