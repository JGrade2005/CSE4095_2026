import { useState } from "react";
import { formatFact } from "../../services/mistakeStatistics";
import type { MistakePattern } from "../../types/mistake";
import OperationBadge from "../common/OperationBadge";
import Button from "../common/Button";
import styles from "./Statistics.module.css";

interface MistakeDetailsProps {
  patterns: MistakePattern[];
  masteryThreshold: number;
}

export default function MistakeDetails({ patterns, masteryThreshold }: MistakeDetailsProps) {
  const [showMastered, setShowMastered] = useState(false);
  const shown = patterns
    .filter((pattern) => pattern.mastered === showMastered)
    .sort((a, b) => b.incorrectCount - a.incorrectCount);
  const listLabel = showMastered ? "Mastered mistake patterns" : "Active mistake patterns";

  return (
    <section className={styles.section} aria-labelledby="mistake-details-heading">
      <h2 id="mistake-details-heading" className={styles.heading}>
        Mistake details
      </h2>
      <Button
        variant="secondary"
        className={styles.toggle}
        aria-pressed={showMastered}
        onClick={() => setShowMastered((current) => !current)}
      >
        <span aria-hidden="true">{showMastered ? "✓ " : ""}</span>
        Show mastered patterns
      </Button>
      {shown.length === 0 ? (
        <p>{showMastered ? "No mastered patterns yet." : "No active mistake patterns."}</p>
      ) : (
        <ul className={styles.list} aria-label={listLabel}>
          {shown.map((pattern) => (
            <li key={pattern.id} className={styles.listItem}>
              <OperationBadge operation={pattern.operation} size="md" />
              <div className={styles.itemBody}>
                <span className={styles.fact}>{formatFact(pattern)}</span>
                <span className={styles.detail}>
                  Missed {pattern.incorrectCount} {pattern.incorrectCount === 1 ? "time" : "times"}
                </span>
                <span className={styles.detail}>
                  {pattern.mastered
                    ? "Mastered"
                    : `Progress: ${Math.min(pattern.similarCorrectCount, masteryThreshold)} of ${masteryThreshold} correct`}
                </span>
                <span className={styles.detail}>
                  Last missed: {new Date(pattern.lastIncorrectAt).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
