import type { RouteObject } from "react-router";
import AppLayout from "../components/layout/AppLayout";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import PracticePage from "../pages/PracticePage";
import PracticeSetupPage from "../pages/PracticeSetupPage";
import SessionSummaryPage from "../pages/SessionSummaryPage";
import SettingsPage from "../pages/SettingsPage";
import StatisticsPage from "../pages/StatisticsPage";

// Paths are relative to the layout route; app/paths.ts holds the absolute versions for links.
export const routes: RouteObject[] = [
  {
    Component: AppLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "practice/setup", Component: PracticeSetupPage },
      { path: "practice/session", Component: PracticePage },
      { path: "practice/summary", Component: SessionSummaryPage },
      { path: "statistics", Component: StatisticsPage },
      { path: "settings", Component: SettingsPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
];
