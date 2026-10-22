import DifficultyStatistics from "../components/statistics/DifficultyStatistics";
import MistakeDetails from "../components/statistics/MistakeDetails";
import MistakeStatistics from "../components/statistics/MistakeStatistics";
import OperationStatistics from "../components/statistics/OperationStatistics";
import RecentSessions from "../components/statistics/RecentSessions";
import ResetStatistics from "../components/statistics/ResetStatistics";
import StatisticsOverview from "../components/statistics/StatisticsOverview";
import { useStatistics } from "../hooks/useStatistics";

export default function StatisticsPage() {
  const stats = useStatistics();

  return (
    <>
      <h1>Statistics</h1>
      <StatisticsOverview
        attempted={stats.statistics.attempted}
        correct={stats.statistics.correct}
        incorrect={stats.statistics.incorrect}
        accuracy={stats.overallAccuracy}
      />
      <OperationStatistics byOperation={stats.statistics.byOperation} />
      <DifficultyStatistics byDifficulty={stats.statistics.byDifficulty} />
      <RecentSessions sessions={stats.sessions} />
      <MistakeStatistics
        activeCount={stats.activeCount}
        masteredCount={stats.masteredCount}
        mostMissedOperations={stats.mostMissedOperations}
        topMissedFacts={stats.topMissedFacts}
        similarPracticed={stats.similarPracticed}
        similarCorrect={stats.similarCorrect}
      />
      <MistakeDetails patterns={stats.patterns} masteryThreshold={stats.masteryThreshold} />
      <ResetStatistics onReset={stats.resetStatistics} />
    </>
  );
}
