import { summarizeSession } from "../../services/statisticsService";
import type { PracticeSession } from "../../types/session";
import { OPERATION_LABELS, formatDifficulty } from "../../utils/labels";
import EmptyState from "../common/EmptyState";
import pageStyles from "./Statistics.module.css";
import styles from "./RecentSessions.module.css";

interface RecentSessionsProps {
  sessions: PracticeSession[];
}

export default function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <section className={pageStyles.section} aria-labelledby="recent-heading">
      <h2 id="recent-heading" className={pageStyles.heading}>
        Recent sessions
      </h2>
      {sessions.length === 0 ? (
        <EmptyState
          headingLevel={3}
          title="No sessions yet"
          message="Finish a practice session and it will be listed here."
        />
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className={styles.caption}>Your most recent practice sessions</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Operations</th>
                <th scope="col">Level</th>
                <th scope="col">Attempted</th>
                <th scope="col">Correct</th>
                <th scope="col">Incorrect</th>
                <th scope="col">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const summary = summarizeSession(session);
                return (
                  <tr key={session.id}>
                    <th scope="row" data-label="Date">
                      {new Date(session.startedAt).toLocaleDateString()}
                    </th>
                    <td data-label="Operations">
                      {session.operations
                        .map((operation) => OPERATION_LABELS[operation])
                        .join(", ")}
                    </td>
                    <td data-label="Level">{formatDifficulty(session.difficulty)}</td>
                    <td data-label="Attempted">{summary.attempted}</td>
                    <td data-label="Correct">{summary.correct}</td>
                    <td data-label="Incorrect">{summary.incorrect}</td>
                    <td data-label="Accuracy">{summary.accuracy}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
