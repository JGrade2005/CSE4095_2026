import { useLocation, useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import type { SessionConfig } from "../types/session";
import { OPERATION_LABELS, formatDifficulty, formatSessionLength } from "../utils/labels";

export default function PracticePage() {
  const navigate = useNavigate();
  const config = (useLocation().state as { config?: SessionConfig } | null)?.config;

  if (!config) {
    return (
      <>
        <h1>Practice</h1>
        <p>No practice session has been set up yet.</p>
        <Button size="large" onClick={() => navigate(paths.practiceSetup)}>
          Set Up Practice
        </Button>
      </>
    );
  }

  const operations = config.operations.map((operation) => OPERATION_LABELS[operation]).join(", ");

  return (
    <>
      <h1>Practice</h1>
      <p>
        Ready to practice: {operations}, {formatDifficulty(config.difficulty)},{" "}
        {formatSessionLength(config.sessionLength)}
      </p>
      <p>Your questions are coming soon!</p>
    </>
  );
}
