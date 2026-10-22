import { useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import SessionSummary from "../components/practice/SessionSummary";
import { usePracticeSession } from "../hooks/usePracticeSession";
import styles from "./SessionSummaryPage.module.css";

export default function SessionSummaryPage() {
  const navigate = useNavigate();
  const { state, startSession, getReviewableCount } = usePracticeSession();
  const { session, config } = state;

  if (state.status !== "complete" || !session || !config) {
    return (
      <>
        <h1>Session Summary</h1>
        <EmptyState
          title="No finished session yet"
          message="Finish a practice session and your results will show up here."
          action={
            <div className={styles.actions}>
              <Button size="large" onClick={() => navigate(paths.practiceSetup)}>
                Set Up Practice
              </Button>
              <Button variant="secondary" size="large" onClick={() => navigate(paths.home)}>
                Return Home
              </Button>
            </div>
          }
        />
      </>
    );
  }

  const canReviewMistakes = getReviewableCount(config.operations, config.difficulty) > 0;

  function practiceAgain(mode: "regular" | "mistake-review") {
    if (!config) return;
    startSession(mode === "regular" ? config : { ...config, mode });
    navigate(paths.practiceSession);
  }

  return (
    <>
      <h1>Session complete!</h1>
      <SessionSummary session={session} reviewQuestionsCompleted={state.reviewQuestionsCompleted} />
      <div className={styles.actions}>
        <Button size="large" onClick={() => practiceAgain("regular")}>
          Practice Again
        </Button>
        <Button
          variant="secondary"
          size="large"
          disabled={!canReviewMistakes}
          aria-describedby={canReviewMistakes ? undefined : "no-mistakes-note"}
          onClick={() => practiceAgain("mistake-review")}
        >
          Practice Mistakes
        </Button>
        <Button variant="secondary" size="large" onClick={() => navigate(paths.practiceSetup)}>
          Change Settings
        </Button>
        <Button variant="secondary" size="large" onClick={() => navigate(paths.statistics)}>
          View Statistics
        </Button>
        <Button variant="secondary" size="large" onClick={() => navigate(paths.home)}>
          Return Home
        </Button>
      </div>
      {!canReviewMistakes && (
        <p id="no-mistakes-note" className={styles.note}>
          No mistakes to review for these choices yet.
        </p>
      )}
    </>
  );
}
