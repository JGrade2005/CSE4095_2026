import { useState } from "react";
import { useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import DifficultySelector from "../components/setup/DifficultySelector";
import OperationSelector from "../components/setup/OperationSelector";
import OptionTile from "../components/setup/OptionTile";
import SessionLengthSelector from "../components/setup/SessionLengthSelector";
import { useSettings } from "../hooks/useSettings";
import { clearAllAppData } from "../services/storageService";
import { initializeStorage } from "../services/practiceRecords";
import type { MathOperation } from "../types/question";
import type { AppSettings } from "../types/settings";
import styles from "./SettingsPage.module.css";

type ToggleKey =
  | "soundEffectsEnabled"
  | "cardAnimationEnabled"
  | "showExplanations"
  | "feedbackMessagesEnabled"
  | "allowNegativeSubtraction";

const MASTERY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, resetSettings } = useSettings();
  const [operations, setOperations] = useState(settings.defaultOperations);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function save(changes: Partial<AppSettings>) {
    updateSettings(changes);
    setSaved(true);
  }

  function handleOperationsChange(next: MathOperation[]) {
    setOperations(next);
    if (next.length === 0) {
      setSaved(false);
      return;
    }
    save({ defaultOperations: next });
  }

  function handleErase() {
    clearAllAppData();
    initializeStorage();
    resetSettings();
    setConfirmOpen(false);
    navigate(paths.home);
  }

  function renderToggle(key: ToggleKey, label: string, description?: string) {
    return (
      <OptionTile
        type="checkbox"
        checked={settings[key]}
        onChange={() => save({ [key]: !settings[key] })}
        label={label}
        description={description}
      />
    );
  }

  return (
    <>
      <h1>Settings</h1>
      <p role="status" className={styles.saved}>
        {saved ? "Settings saved" : ""}
      </p>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Sounds and motion</legend>
        <div className={styles.grid}>
          {renderToggle("soundEffectsEnabled", "Sound effects")}
          {renderToggle("cardAnimationEnabled", "Animations (card flip and moving background)")}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Practice help</legend>
        <div className={styles.grid}>
          {renderToggle("showExplanations", "Show explanations")}
          {renderToggle("feedbackMessagesEnabled", "Feedback messages")}
          {renderToggle(
            "allowNegativeSubtraction",
            "Allow negative answers in Advanced subtraction",
          )}
        </div>
      </fieldset>

      <section className={styles.section} aria-labelledby="defaults-heading">
        <h2 id="defaults-heading" className={styles.heading}>
          Practice defaults
        </h2>
        <OperationSelector
          legend="Default operations"
          value={operations}
          onChange={handleOperationsChange}
        />
        {operations.length === 0 && (
          <p role="status" className={styles.warning}>
            Pick at least one kind of math to save your defaults.
          </p>
        )}
        <DifficultySelector
          legend="Default difficulty"
          value={settings.defaultDifficulty}
          onChange={(level) => save({ defaultDifficulty: level })}
        />
        <SessionLengthSelector
          legend="Default session length"
          value={settings.defaultSessionLength}
          onChange={(length) => save({ defaultSessionLength: length })}
        />
      </section>

      <section className={styles.section} aria-labelledby="mastery-heading">
        <h2 id="mastery-heading" className={styles.heading}>
          Mastering mistakes
        </h2>
        <label className={styles.field}>
          <span>Correct similar answers needed to master a mistake</span>
          <select
            className={styles.select}
            value={settings.masteryThreshold}
            onChange={(event) => save({ masteryThreshold: Number(event.target.value) })}
          >
            {MASTERY_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.section} aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className={styles.heading}>
          Your data
        </h2>
        <p>
          Your progress is saved only in this browser on this device. Clearing your browser data may
          erase your progress.
        </p>
        <Button variant="secondary" className={styles.danger} onClick={() => setConfirmOpen(true)}>
          Clear All Application Data
        </Button>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Erase everything?"
        message="This will erase all settings, practice history, statistics, and mistakes on this device. This cannot be undone."
        confirmLabel="Yes, erase everything"
        onConfirm={handleErase}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
