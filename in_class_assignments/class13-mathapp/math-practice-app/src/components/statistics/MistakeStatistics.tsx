import { formatFact } from "../../services/mistakeStatistics";
import type { MistakePattern } from "../../types/mistake";
import type { MathOperation } from "../../types/question";
import { OPERATION_LABELS } from "../../utils/labels";
import OperationBadge from "../common/OperationBadge";
import EmptyState from "../common/EmptyState";
import StatCard from "./StatCard";
import styles from "./Statistics.module.css";

interface MistakeStatisticsProps {
  activeCount: number;
  masteredCount: number;
  mostMissedOperations: MathOperation[];
  topMissedFacts: MistakePattern[];
  similarPracticed: number;
  similarCorrect: number;
}

export default function MistakeStatistics({
  activeCount,
  masteredCount,
  mostMissedOperations,
  topMissedFacts,
  similarPracticed,
  similarCorrect,
}: MistakeStatisticsProps) {
  const hasMistakes = activeCount + masteredCount > 0;
  return (
    <section className={styles.section} aria-labelledby="mistakes-heading">
      <h2 id="mistakes-heading" className={styles.heading}>
        Mistake review
      </h2>
      <dl className={styles.grid}>
        <StatCard label="Active mistake patterns" value={activeCount} tone="warm" />
        <StatCard label="Mastered patterns" value={masteredCount} tone="good" />
        <StatCard label="Similar questions practiced" value={similarPracticed} tone="primary" />
        <StatCard label="Review questions answered correctly" value={similarCorrect} tone="sun" />
      </dl>
      {hasMistakes ? (
        <>
          <h3 className={styles.subheading}>Most missed operation</h3>
          <p className={styles.operationLine}>
            <span>
              {mostMissedOperations.map((operation) => OPERATION_LABELS[operation]).join(", ")}
            </span>
            {mostMissedOperations.map((operation) => (
              <OperationBadge key={operation} operation={operation} size="sm" />
            ))}
          </p>
          <h3 className={styles.subheading}>Most missed number facts</h3>
          <ol className={styles.list} aria-label="Most missed number facts">
            {topMissedFacts.map((pattern) => (
              <li key={pattern.id} className={styles.listItem}>
                <OperationBadge operation={pattern.operation} size="md" />
                <div className={styles.itemBody}>
                  <span className={styles.fact}>{formatFact(pattern)}</span>
                  Missed {pattern.incorrectCount} {pattern.incorrectCount === 1 ? "time" : "times"}
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <EmptyState
          headingLevel={3}
          title="No mistakes yet"
          message="When you miss a question, it will show up here so you can practice it again."
        />
      )}
    </section>
  );
}
