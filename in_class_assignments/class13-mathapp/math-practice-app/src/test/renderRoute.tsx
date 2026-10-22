import { render } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routes } from "../app/routes";
import PracticeSessionProvider from "../app/PracticeSessionProvider";
import SettingsProvider from "../app/SettingsProvider";

export function renderRoute(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const view = render(
    <SettingsProvider>
      <PracticeSessionProvider>
        <RouterProvider router={router} />
      </PracticeSessionProvider>
    </SettingsProvider>,
  );
  return { router, ...view };
}
