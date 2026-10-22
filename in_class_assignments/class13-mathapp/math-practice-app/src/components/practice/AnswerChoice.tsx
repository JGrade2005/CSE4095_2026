import styles from "./AnswerChoice.module.css";

export interface AnswerChoiceProps {
  value: number;
  selected: boolean;
  disabled: boolean;
  onSelect: (value: number) => void;
}

export default function AnswerChoice({ value, selected, disabled, onSelect }: AnswerChoiceProps) {
  return (
    <button
      type="button"
      className={styles.choice}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(value)}
    >
      <span className={styles.number}>{value}</span>
      {selected && (
        <span className={styles.mark} aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}
