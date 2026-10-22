import type { PracticeAttempt, PracticeSession } from "../types/session";
import type { AppStatistics, OperationStatistics } from "../types/statistics";

export interface SessionSummary {
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export function calculateAccuracy(correct: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return Math.round((correct / attempted) * 100);
}

function addAttempt(counts: OperationStatistics, isCorrect: boolean): OperationStatistics {
  return {
    attempted: counts.attempted + 1,
    correct: counts.correct + (isCorrect ? 1 : 0),
    incorrect: counts.incorrect + (isCorrect ? 0 : 1),
  };
}

export function applyAttemptToStatistics(
  stats: AppStatistics,
  attempt: PracticeAttempt,
): AppStatistics {
  const isCorrect = attempt.selfReportedCorrect;
  return {
    ...addAttempt(stats, isCorrect),
    byOperation: {
      ...stats.byOperation,
      [attempt.operation]: addAttempt(stats.byOperation[attempt.operation], isCorrect),
    },
    byDifficulty: {
      ...stats.byDifficulty,
      [attempt.difficulty]: addAttempt(stats.byDifficulty[attempt.difficulty], isCorrect),
    },
  };
}

export function summarizeSession(session: PracticeSession): SessionSummary {
  return {
    attempted: session.attempted,
    correct: session.correct,
    incorrect: session.incorrect,
    accuracy: calculateAccuracy(session.correct, session.attempted),
  };
}
