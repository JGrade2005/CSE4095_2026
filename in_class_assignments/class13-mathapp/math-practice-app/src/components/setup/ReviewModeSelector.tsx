import { useId } from "react";
import type { PracticeMode } from "../../types/session";
import styles from "./ReviewModeSelector.module.css";
import groupStyles from "./SelectorGroup.module.css";

interface ReviewModeSelectorProps {
  value: PracticeMode;
  onChange: (mode: PracticeMode) => void;
  reviewableCount: number;
  legend?: string;
}

export default function ReviewModeSelector({
  value,
  onChange,
  reviewableCount,
  legend = "How do you want to practice?",
}: ReviewModeSelectorProps) {
  const name = useId();
  const infoId = useId();
  const reviewAvailable = reviewableCount > 0;

  return (
    <fieldset className={groupStyles.group}>
      <legend className={groupStyles.legend}>{legend}</legend>
      <div className={groupStyles.grid}>
        <label className={styles.tile}>
          <input
            className={styles.input}
            type="radio"
            name={name}
            checked={value === "regular"}
            onChange={() => onChange("regular")}
          />
          <span className={styles.body}>
            <span className={styles.label}>Regular practice</span>
            <span className={styles.mark} aria-hidden="true">
              {value === "regular" ? "✓ Selected" : ""}
            </span>
          </span>
        </label>
        <label className={`${styles.tile} ${reviewAvailable ? "" : styles.unavailable}`}>
          <input
            className={styles.input}
            type="radio"
            name={name}
            checked={value === "mistake-review"}
            disabled={!reviewAvailable}
            aria-describedby={infoId}
            onChange={() => onChange("mistake-review")}
          />
          <span className={styles.body}>
            <span className={styles.label}>Practice my mistakes</span>
            <span className={styles.mark} aria-hidden="true">
              {value === "mistake-review"
                ? "✓ Selected"
                : reviewAvailable
                  ? ""
                  : "Not available yet"}
            </span>
          </span>
        </label>
      </div>
      <p id={infoId} className={styles.info}>
        {reviewAvailable
          ? `You have ${reviewableCount} ${reviewableCount === 1 ? "mistake" : "mistakes"} to review for these choices.`
          : "No mistakes to review for these choices yet."}
      </p>
    </fieldset>
  );
}
