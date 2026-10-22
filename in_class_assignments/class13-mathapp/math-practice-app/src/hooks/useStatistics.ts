import { useCallback, useMemo, useState } from "react";
import {
  loadAttempts,
  loadMistakePatterns,
  loadRecentSessions,
  loadSettings,
  loadStatistics,
} from "../services/practiceRecords";
import {
  countActivePatterns,
  countMasteredPatterns,
  countSimilarCorrect,
  countSimilarPracticed,
  getMostMissedOperations,
  getTopMissedFacts,
} from "../services/mistakeStatistics";
import { STORAGE_KEYS } from "../services/storageKeys";
import { clearCategory } from "../services/storageService";
import { calculateAccuracy } from "../services/statisticsService";
import { createEmptyStatistics } from "../services/defaults";
import type { MistakePattern } from "../types/mistake";
import type { PracticeAttempt, PracticeSession } from "../types/session";
import type { AppStatistics } from "../types/statistics";

export const RECENT_SESSION_LIMIT = 10;

interface StatisticsData {
  statistics: AppStatistics;
  sessions: PracticeSession[];
  patterns: MistakePattern[];
  attempts: PracticeAttempt[];
  masteryThreshold: number;
}

function loadData(): StatisticsData {
  return {
    statistics: loadStatistics(),
    sessions: loadRecentSessions(RECENT_SESSION_LIMIT),
    patterns: loadMistakePatterns(),
    attempts: loadAttempts(),
    masteryThreshold: loadSettings().masteryThreshold,
  };
}

const RESET_KEYS = [
  STORAGE_KEYS.attempts,
  STORAGE_KEYS.sessions,
  STORAGE_KEYS.statistics,
  STORAGE_KEYS.mistakePatterns,
] as const;

export function useStatistics() {
  const [data, setData] = useState<StatisticsData>(loadData);
  const { statistics, sessions, patterns, attempts, masteryThreshold } = data;

  const derived = useMemo(
    () => ({
      overallAccuracy: calculateAccuracy(statistics.correct, statistics.attempted),
      activeCount: countActivePatterns(patterns),
      masteredCount: countMasteredPatterns(patterns),
      mostMissedOperations: getMostMissedOperations(patterns),
      topMissedFacts: getTopMissedFacts(patterns),
      similarPracticed: countSimilarPracticed(attempts),
      similarCorrect: countSimilarCorrect(attempts),
    }),
    [statistics, patterns, attempts],
  );

  const resetStatistics = useCallback(() => {
    RESET_KEYS.forEach((key) => clearCategory(key));
    setData({
      statistics: createEmptyStatistics(),
      sessions: [],
      patterns: [],
      attempts: [],
      masteryThreshold: loadSettings().masteryThreshold,
    });
  }, []);

  return { statistics, sessions, patterns, masteryThreshold, ...derived, resetStatistics };
}
