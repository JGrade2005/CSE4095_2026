import type { RouteObject } from "react-router";
import PageLoading from "../components/common/PageLoading";
import RouteError from "../components/common/RouteError";
import AppLayout from "../components/layout/AppLayout";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import PracticePage from "../pages/PracticePage";
import PracticeSetupPage from "../pages/PracticeSetupPage";
import SessionSummaryPage from "../pages/SessionSummaryPage";

// Statistics and Settings are not needed to start practicing, so they load as separate chunks.
// Paths are relative to the layout route; app/paths.ts holds the absolute versions for links.
export const routes: RouteObject[] = [
  {
    Component: AppLayout,
    ErrorBoundary: RouteError,
    HydrateFallback: PageLoading,
    children: [
      { index: true, Component: HomePage },
      { path: "practice/setup", Component: PracticeSetupPage },
      { path: "practice/session", Component: PracticePage },
      { path: "practice/summary", Component: SessionSummaryPage },
      {
        path: "statistics",
        lazy: async () => ({ Component: (await import("../pages/StatisticsPage")).default }),
      },
      {
        path: "settings",
        lazy: async () => ({ Component: (await import("../pages/SettingsPage")).default }),
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
];
