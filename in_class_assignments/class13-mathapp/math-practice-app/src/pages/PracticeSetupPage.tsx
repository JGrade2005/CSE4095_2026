import { useState } from "react";
import { useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import DifficultySelector from "../components/setup/DifficultySelector";
import OperationSelector from "../components/setup/OperationSelector";
import ReviewModeSelector from "../components/setup/ReviewModeSelector";
import SessionLengthSelector from "../components/setup/SessionLengthSelector";
import { usePracticeSession } from "../hooks/usePracticeSession";
import { useSettings } from "../hooks/useSettings";
import { DIFFICULTY_LEVELS } from "../types/question";
import type { DifficultyLevel, MathOperation } from "../types/question";
import type { PracticeMode, SessionConfig } from "../types/session";
import styles from "./PracticeSetupPage.module.css";

export default function PracticeSetupPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { startSession, getReviewableCount } = usePracticeSession();
  const [operations, setOperations] = useState(settings.defaultOperations);
  const [difficulty, setDifficulty] = useState(settings.defaultDifficulty);
  const [sessionLength, setSessionLength] = useState(settings.defaultSessionLength);
  const [mode, setMode] = useState<PracticeMode>("regular");

  const reviewableCount = getReviewableCount(operations, difficulty);
  const effectiveMode: PracticeMode = reviewableCount > 0 ? mode : "regular";
  const canStart = operations.length > 0 && DIFFICULTY_LEVELS.includes(difficulty);

  // Without this reset, review mode would silently come back if the count rose again.
  function changeChoices(nextOperations: MathOperation[], nextDifficulty: DifficultyLevel) {
    setOperations(nextOperations);
    setDifficulty(nextDifficulty);
    if (getReviewableCount(nextOperations, nextDifficulty) === 0) setMode("regular");
  }

  function handleStart() {
    const config: SessionConfig = {
      operations,
      difficulty,
      sessionLength,
      mode: effectiveMode,
    };
    startSession(config);
    navigate(paths.practiceSession);
  }

  return (
    <>
      <h1>Practice Setup</h1>
      <OperationSelector value={operations} onChange={(next) => changeChoices(next, difficulty)} />
      <DifficultySelector value={difficulty} onChange={(next) => changeChoices(operations, next)} />
      <SessionLengthSelector value={sessionLength} onChange={setSessionLength} />
      <ReviewModeSelector
        value={effectiveMode}
        onChange={setMode}
        reviewableCount={reviewableCount}
      />
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
