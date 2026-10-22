import { speakNumber } from "../../utils/spokenMath";
import styles from "./AnswerChoice.module.css";

export interface AnswerChoiceProps {
  value: number;
  selected: boolean;
  disabled: boolean;
  onSelect: (value: number) => void;
  shortcut?: number;
}

export default function AnswerChoice({
  value,
  selected,
  disabled,
  onSelect,
  shortcut,
}: AnswerChoiceProps) {
  return (
    <button
      type="button"
      className={styles.choice}
      aria-pressed={selected}
      aria-label={value < 0 ? speakNumber(value) : undefined}
      aria-keyshortcuts={shortcut === undefined ? undefined : String(shortcut)}
      disabled={disabled}
      onClick={() => onSelect(value)}
    >
      {shortcut !== undefined && (
        <span className={styles.shortcut} aria-hidden="true">
          {shortcut}
        </span>
      )}
      <span className={styles.number}>{value}</span>
      {selected && (
        <span className={styles.mark} aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}
