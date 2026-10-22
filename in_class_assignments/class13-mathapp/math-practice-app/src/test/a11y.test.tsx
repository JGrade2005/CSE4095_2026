import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoViolations, findViolations } from "./axe";
import { warmLazyRoutes } from "./integrationUtils";
import {
  pickFirstChoiceAndFlip,
  resetAppStorage,
  seedAdditionMistake,
  startFromSetup,
} from "./practiceTestUtils";
import { renderRoute } from "./renderRoute";
import { seedStorage } from "./statisticsTestData";
import { createDefaultSettings } from "../services/defaults";
import { saveSettings } from "../services/practiceRecords";
import { resetStorageServiceState } from "../services/storageService";

// Color contrast is switched off in ./axe because jsdom cannot compute colors; it was checked by hand.
// axe is slow on a full page, so give each test room when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20000 });

beforeAll(warmLazyRoutes);

beforeEach(() => {
  resetAppStorage();
});

async function pageAt(path: string, heading: string) {
  const view = renderRoute(path);
  await screen.findByRole("heading", { level: 1, name: heading }, { timeout: 5000 });
  return view;
}

describe("accessibility with axe", () => {
  it("the checker reports a real problem, so a clean result means something", async () => {
    document.body.innerHTML = '<main><h1>Test</h1><img src="a.png"><button></button></main>';
    const ids = (await findViolations()).map((violation) => violation.id);
    document.body.innerHTML = "";
    expect(ids).toEqual(expect.arrayContaining(["image-alt", "button-name"]));
  });

  it("Home has no violations", async () => {
    await pageAt("/", "Welcome to Math Practice!");
    await expectNoViolations();
  });

  it("Practice Setup has no violations", async () => {
    await pageAt("/practice/setup", "Practice Setup");
    await expectNoViolations();
  });

  it("Practice Setup with review mode available has no violations", async () => {
    seedAdditionMistake();
    await pageAt("/practice/setup", "Practice Setup");
    fireEvent.click(screen.getByRole("radio", { name: "Practice my mistakes" }));
    await expectNoViolations();
  });

  it("Practice has no violations on the front of the card", async () => {
    await pageAt("/practice/setup", "Practice Setup");
    startFromSetup();
    await expectNoViolations();
  });

  it("Practice has no violations with an answer picked", async () => {
    await pageAt("/practice/setup", "Practice Setup");
    startFromSetup();
    const group = screen.getByRole("group", { name: "Answer choices" });
    fireEvent.click(within(group).getAllByRole("button")[0]);
    await expectNoViolations();
  });

  it("Practice has no violations on the back of the card", async () => {
    await pageAt("/practice/setup", "Practice Setup");
    startFromSetup();
    pickFirstChoiceAndFlip();
    await expectNoViolations();
  });

  it("Practice has no violations with the flip animation on, front and back", async () => {
    resetAppStorage({ cardAnimationEnabled: true });
    await pageAt("/practice/setup", "Practice Setup");
    startFromSetup();
    await expectNoViolations();
    pickFirstChoiceAndFlip();
    await expectNoViolations();
  });

  it("Continuous practice has no violations", async () => {
    await pageAt("/practice/setup", "Practice Setup");
    fireEvent.click(screen.getByRole("radio", { name: "Continuous practice" }));
    startFromSetup();
    await expectNoViolations();
  });

  it("the End Session dialog has no violations", async () => {
    const user = userEvent.setup();
    await pageAt("/practice/setup", "Practice Setup");
    fireEvent.click(screen.getByRole("radio", { name: "Continuous practice" }));
    startFromSetup();
    await user.click(screen.getByRole("button", { name: "End Session" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await expectNoViolations();
  });

  it("the Practice page with no session has no violations", async () => {
    await pageAt("/practice/session", "Practice");
    await expectNoViolations();
  });

  it("Session Summary has no violations", async () => {
    await pageAt("/practice/setup", "Practice Setup");
    startFromSetup();
    for (let i = 0; i < 5; i++) {
      pickFirstChoiceAndFlip();
      fireEvent.click(
        screen.getByRole("button", { name: i === 0 ? "I Got It Wrong" : "I Got It Right" }),
      );
      await screen.findByText(
        i < 4 ? `Question ${i + 2} of 5` : "Your results",
        {},
        { timeout: 3000 },
      );
    }
    expect(screen.getByRole("heading", { name: "Your results" })).toBeInTheDocument();
    await expectNoViolations();
  });

  it("Session Summary with nothing finished has no violations", async () => {
    await pageAt("/practice/summary", "Session Summary");
    await expectNoViolations();
  });

  it("Statistics with no data has no violations", async () => {
    await pageAt("/statistics", "Statistics");
    await expectNoViolations();
  });

  it("Statistics with seeded data has no violations", async () => {
    seedStorage();
    await pageAt("/statistics", "Statistics");
    await expectNoViolations();
  });

  it("the Reset Statistics dialog has no violations", async () => {
    const user = userEvent.setup();
    seedStorage();
    await pageAt("/statistics", "Statistics");
    await user.click(screen.getByRole("button", { name: "Reset Statistics" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await expectNoViolations();
  });

  it("Settings has no violations", async () => {
    await pageAt("/settings", "Settings");
    await expectNoViolations();
  });

  it("the Clear All Application Data dialog has no violations", async () => {
    const user = userEvent.setup();
    await pageAt("/settings", "Settings");
    await user.click(screen.getByRole("button", { name: "Clear All Application Data" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await expectNoViolations();
  });

  it("Not Found has no violations", async () => {
    await pageAt("/no/such/page", "Page not found");
    await expectNoViolations();
  });

  it("pages stay free of violations when the storage warning is showing", async () => {
    resetStorageServiceState();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    try {
      saveSettings(createDefaultSettings());
      await pageAt("/", "Welcome to Math Practice!");
      expect(screen.getByText(/no room left to save/)).toBeInTheDocument();
      await expectNoViolations();
    } finally {
      spy.mockRestore();
    }
  });
});
