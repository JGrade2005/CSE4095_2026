import { useState } from "react";
import Button from "../common/Button";
import ConfirmDialog from "../common/ConfirmDialog";
import styles from "./Statistics.module.css";

interface ResetStatisticsProps {
  onReset: () => void;
}

export default function ResetStatistics({ onReset }: ResetStatisticsProps) {
  const [open, setOpen] = useState(false);

  function confirm() {
    onReset();
    setOpen(false);
  }

  return (
    <section className={styles.section} aria-labelledby="reset-heading">
      <h2 id="reset-heading" className={styles.heading}>
        Start over
      </h2>
      <p>Want a fresh start? This erases your practice history. Your settings stay the same.</p>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Reset Statistics
      </Button>
      <ConfirmDialog
        open={open}
        title="Reset statistics?"
        message="Are you sure you want to erase all practice history and statistics?"
        confirmLabel="Yes, erase my history"
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </section>
  );
}
