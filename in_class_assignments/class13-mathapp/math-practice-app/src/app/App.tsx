import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routes } from "./routes";
import SettingsProvider from "./SettingsProvider";

// A data router (not BrowserRouter) is required so useBlocker can guard active sessions later.
const router = createBrowserRouter(routes);

export default function App() {
  return (
    <SettingsProvider>
      <RouterProvider router={router} />
    </SettingsProvider>
  );
}
