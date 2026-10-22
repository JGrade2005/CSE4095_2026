import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { routes } from "./routes";
import PracticeSessionProvider from "./PracticeSessionProvider";
import SettingsProvider from "./SettingsProvider";

// A data router (not BrowserRouter) is required so PracticePage can use useBlocker to guard active sessions.
const router = createBrowserRouter(routes);

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <PracticeSessionProvider>
          <RouterProvider router={router} />
        </PracticeSessionProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
