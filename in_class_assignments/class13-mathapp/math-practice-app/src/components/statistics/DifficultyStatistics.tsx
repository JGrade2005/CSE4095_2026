import { DIFFICULTY_LEVELS } from "../../types/question";
import type { AppStatistics } from "../../types/statistics";
import { formatDifficulty } from "../../utils/labels";
import BreakdownCard from "./BreakdownCard";
import styles from "./Statistics.module.css";

interface DifficultyStatisticsProps {
  byDifficulty: AppStatistics["byDifficulty"];
}

export default function DifficultyStatistics({ byDifficulty }: DifficultyStatisticsProps) {
  return (
    <section className={styles.section} aria-labelledby="difficulty-heading">
      <h2 id="difficulty-heading" className={styles.heading}>
        Results by level
      </h2>
      <ul className={styles.cardGrid}>
        {DIFFICULTY_LEVELS.map((level) => (
          <BreakdownCard
            key={level}
            title={formatDifficulty(level)}
            counts={byDifficulty[level]}
            level={level}
          />
        ))}
      </ul>
    </section>
  );
}
