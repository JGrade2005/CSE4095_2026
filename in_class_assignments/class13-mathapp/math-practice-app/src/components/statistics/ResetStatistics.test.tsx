import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatisticsPage from "../../pages/StatisticsPage";
import { STORAGE_KEYS } from "../../services/storageKeys";
import { resetStorageServiceState } from "../../services/storageService";
import { SEED_SETTINGS, seedStorage } from "../../test/statisticsTestData";

const MESSAGE = "Are you sure you want to erase all practice history and statistics?";

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Reset Statistics" }));
  return screen.getByRole("alertdialog");
}

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
  seedStorage();
});

describe("ResetStatistics", () => {
  it("shows no dialog until Reset Statistics is clicked", () => {
    render(<StatisticsPage />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks with the exact spec message", async () => {
    const user = userEvent.setup();
    render(<StatisticsPage />);
    const dialog = await openDialog(user);
    expect(within(dialog).getByText(MESSAGE)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Reset statistics?" })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Yes, erase my history" }),
    ).toBeInTheDocument();
  });

  it("keeps all data when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<StatisticsPage />);
    const dialog = await openDialog(user);
    const before = { ...localStorage };

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect({ ...localStorage }).toEqual(before);
    expect(
      within(screen.getByRole("region", { name: "Overall results" })).getByText("10"),
    ).toBeInTheDocument();
  });

  it("clears attempts, sessions, statistics and patterns on confirm and keeps settings", async () => {
    const user = userEvent.setup();
    render(<StatisticsPage />);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Yes, erase my history" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.attempts)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.sessions)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.statistics)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.mistakePatterns)).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? "null")).toEqual(
      SEED_SETTINGS,
    );
  });

  it("shows zeros and empty states without reloading", async () => {
    const user = userEvent.setup();
    render(<StatisticsPage />);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Yes, erase my history" }));

    const overall = within(screen.getByRole("region", { name: "Overall results" }));
    expect(overall.getByText("Questions attempted").nextElementSibling).toHaveTextContent("0");
    expect(overall.getByText("Accuracy").nextElementSibling).toHaveTextContent("0%");
    expect(screen.getByRole("heading", { name: "No practice yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No sessions yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No mistakes yet" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NaN");
  });
});
