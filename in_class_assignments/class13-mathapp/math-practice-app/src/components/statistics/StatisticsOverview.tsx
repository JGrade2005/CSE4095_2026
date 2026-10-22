import EmptyState from "../common/EmptyState";
import StatCard from "./StatCard";
import styles from "./Statistics.module.css";

interface StatisticsOverviewProps {
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export default function StatisticsOverview({
  attempted,
  correct,
  incorrect,
  accuracy,
}: StatisticsOverviewProps) {
  return (
    <section className={styles.section} aria-labelledby="overview-heading">
      <h2 id="overview-heading" className={styles.heading}>
        Overall results
      </h2>
      {attempted === 0 && (
        <EmptyState
          headingLevel={3}
          title="No practice yet"
          message="Answer some questions and your results will show up here. You can do it!"
        />
      )}
      <dl className={styles.grid}>
        <StatCard label="Questions attempted" value={attempted} />
        <StatCard label="Correct answers" value={correct} />
        <StatCard label="Incorrect answers" value={incorrect} />
        <StatCard label="Accuracy" value={`${accuracy}%`} />
      </dl>
    </section>
  );
}
