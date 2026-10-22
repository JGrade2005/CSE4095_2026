import styles from "./ProgressBar.module.css";

export interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;
  const text = `${completed} of ${total} done`;

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Session progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-valuetext={text}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      <p className={styles.text}>{text}</p>
    </div>
  );
}
