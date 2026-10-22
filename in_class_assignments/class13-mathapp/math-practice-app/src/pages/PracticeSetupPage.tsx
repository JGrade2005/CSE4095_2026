import { useState } from "react";
import { useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import DifficultySelector from "../components/setup/DifficultySelector";
import OperationSelector from "../components/setup/OperationSelector";
import SessionLengthSelector from "../components/setup/SessionLengthSelector";
import { useSettings } from "../hooks/useSettings";
import { DIFFICULTY_LEVELS } from "../types/question";
import type { SessionConfig } from "../types/session";
import styles from "./PracticeSetupPage.module.css";

export default function PracticeSetupPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [operations, setOperations] = useState(settings.defaultOperations);
  const [difficulty, setDifficulty] = useState(settings.defaultDifficulty);
  const [sessionLength, setSessionLength] = useState(settings.defaultSessionLength);

  const canStart = operations.length > 0 && DIFFICULTY_LEVELS.includes(difficulty);

  function handleStart() {
    const config: SessionConfig = { operations, difficulty, sessionLength, mode: "regular" };
    navigate(paths.practiceSession, { state: { config } });
  }

  return (
    <>
      <h1>Practice Setup</h1>
      <OperationSelector value={operations} onChange={setOperations} />
      <DifficultySelector value={difficulty} onChange={setDifficulty} />
      <SessionLengthSelector value={sessionLength} onChange={setSessionLength} />
      <div className={styles.actions}>
        <Button size="large" disabled={!canStart} onClick={handleStart}>
          Start Session
        </Button>
        <p role="status" className={styles.message}>
          {canStart ? "" : "Pick at least one kind of math to start."}
        </p>
      </div>
    </>
  );
}
