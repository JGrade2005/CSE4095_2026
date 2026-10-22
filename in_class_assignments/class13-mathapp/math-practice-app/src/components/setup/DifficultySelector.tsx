import { useId } from "react";
import { DIFFICULTY_LEVELS } from "../../types/question";
import type { DifficultyLevel } from "../../types/question";
import { DIFFICULTY_DESCRIPTIONS, formatDifficulty } from "../../utils/labels";
import OptionTile from "./OptionTile";
import tileStyles from "./OptionTile.module.css";
import styles from "./SelectorGroup.module.css";

interface DifficultySelectorProps {
  value: DifficultyLevel;
  onChange: (level: DifficultyLevel) => void;
  legend?: string;
}

export default function DifficultySelector({
  value,
  onChange,
  legend = "How hard should it be?",
}: DifficultySelectorProps) {
  const name = useId();

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.grid}>
        {DIFFICULTY_LEVELS.map((level) => (
          <OptionTile
            key={level}
            type="radio"
            name={name}
            checked={value === level}
            onChange={() => onChange(level)}
            label={formatDifficulty(level)}
            description={DIFFICULTY_DESCRIPTIONS[level]}
            icon={<span className={tileStyles.stars}>{"★".repeat(level)}</span>}
          />
        ))}
      </div>
    </fieldset>
  );
}
