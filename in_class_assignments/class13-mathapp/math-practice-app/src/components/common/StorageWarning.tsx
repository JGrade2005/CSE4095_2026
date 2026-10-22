import { useState } from "react";
import { useStorageStatus } from "../../hooks/useStorageStatus";
import Button from "./Button";
import styles from "./StorageWarning.module.css";

const UNAVAILABLE_MESSAGE =
  "We can't save your progress on this device right now. You can keep practicing, but your progress may not be saved.";
const FULL_MESSAGE =
  "This device has no room left to save your progress. You can keep practicing, but new progress may not be saved.";

export default function StorageWarning() {
  const { available, quotaExceeded } = useStorageStatus();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (available && !quotaExceeded)) return null;

  return (
    <div className={styles.warning} role="status">
      <p className={styles.text}>{available ? FULL_MESSAGE : UNAVAILABLE_MESSAGE}</p>
      <Button variant="secondary" onClick={() => setDismissed(true)}>
        Got it
      </Button>
    </div>
  );
}
