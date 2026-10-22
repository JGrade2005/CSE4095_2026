import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetStorageServiceState, writeCategory } from "../../services/storageService";
import { STORAGE_KEYS } from "../../services/storageKeys";
import { initializeStorage, loadAttempts } from "../../services/practiceRecords";
import { answerQuestion, startFromSetup } from "../../test/practiceTestUtils";
import { renderRoute } from "../../test/renderRoute";

const UNAVAILABLE_TEXT =
  "We can't save your progress on this device right now. You can keep practicing, but your progress may not be saved.";

function blockStorage() {
  const denied = () => {
    throw new DOMException("denied", "SecurityError");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(denied);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(denied);
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(denied);
}

beforeEach(() => {
  localStorage.clear();
  resetStorageServiceState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StorageWarning", () => {
  it("shows nothing when storage works", () => {
    renderRoute("/");
    expect(screen.queryByText(/can't save/i)).not.toBeInTheDocument();
  });

  it("explains in simple words when storage is blocked", () => {
    blockStorage();
    renderRoute("/");
    expect(screen.getByRole("status")).toHaveTextContent(UNAVAILABLE_TEXT);
  });

  it("can be dismissed and stays dismissed while moving between pages", async () => {
    blockStorage();
    const { router } = renderRoute("/");
    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await act(() => router.navigate("/practice/setup"));
    expect(screen.queryByText(UNAVAILABLE_TEXT)).not.toBeInTheDocument();
  });

  it("appears when storage fails later because the device is full", () => {
    renderRoute("/");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    act(() => {
      writeCategory(STORAGE_KEYS.settings, {});
    });

    expect(screen.getByRole("status")).toHaveTextContent(/no room left/i);
  });

  it("lets a practice session keep working from memory", () => {
    blockStorage();
    initializeStorage();
    renderRoute("/practice/setup");
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument();

    startFromSetup();
    expect(screen.getByText(/^Question 1 of \d+$/)).toBeInTheDocument();
    answerQuestion(true);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(loadAttempts()).toHaveLength(1);
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument();
  });
});
