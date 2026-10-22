# Math Practice App: Grouped Implementation Plan

Phases 3 to 22 are grouped by the kind of code they need, so similar work is built together with the same patterns and test style. Groups with no shared files run in parallel. Each group ends with a **confirmation gate**: automated tests to run and quick manual checks, so you can confirm before the next group starts.

Phases stay whole. A group is only done when every TODO checkbox in its phases is ticked. `node progress.mjs` reads the `Phases:` line of each group below and prints a bar per group.

## Overview

| Group | Name | Phases | Kind of code | Wave |
|---|---|---|---|---|
| G0 | Setup and basic interface | 1, 2 | Done | Done |
| G1 | Question generation | 4, 5, 13 | Pure TypeScript functions | 1 |
| G2 | Storage and mistake records | 9, 12 | localStorage service and record logic | 1 |
| G3 | Configuration forms | 3, 11 | Form controls and settings | 2 |
| G4 | Statistics | 10, 15 | Calculations and display pages | 2 |
| G5 | Practice flow | 6, 7, 8, 14 | Card UI and session state machine | 3 |
| G6 | UX quality | 16, 17 | Accessibility and responsive pass | 4 |
| G7 | Robustness | 18, 19, 21 | Recovery, errors, performance | 4 |
| G8 | Verify and ship | 20, 22 | Integration tests and release | 5 |

```text
Wave 1   G1 Question generation  ||  G2 Storage and mistake records      (parallel)
Wave 2   G3 Configuration forms  ||  G4 Statistics                       (parallel)
Wave 3   G5 Practice flow                                                (single)
Wave 4   G6 UX quality           ||  G7 Robustness                       (parallel)
Wave 5   G8 Verify and ship                                              (single)
```

There are 20 phases left, grouped into 8 groups and 5 waves. Three of the waves run two agents at once.

### Why this order

- **Logic before UI.** G1 and G2 have no UI, so they are fast to test and everything else depends on them.
- **Forms and statistics together in Wave 2.** Both only need G1 and G2, and they live on different pages. G4 can test against seeded storage data, so it does not need the practice flow first.
- **Practice flow as one group.** The card (6), session (7), summary (8) and review mode (14) share a single session state machine. Review mode is just a second way to pick questions for that same machine, so building it alongside the rest avoids reworking it later.
- **The two audits run side by side.** G6 owns `components/practice/*`, the CSS and the header. G7 owns `services/`, `app/` and `PracticePage.tsx`. That file split keeps them from conflicting.
- **Phase 20 (Testing) is spread across the groups.** Each group writes the tests for its own phases, and the matching Phase 20 checkboxes are ticked when those tests pass. G8 adds the integration and accessibility tests and fills any gaps.

### Agent routing

- **Sonnet:** writes the code and tests for each group.
- **Opus (main):** designs the shared contracts before each wave and reviews the diffs.
- **Haiku:** checks each finished group against the spec and TODO.

---

## G0. Setup and basic interface (Done)

**Phases:** 1, 2

---

## G1. Question generation (Wave 1)

**Phases:** 4, 5, 13

All three phases produce a valid `Question`. Phase 4 builds the operands, Phase 5 builds the answer choices, and Phase 13 builds a related question from a `MistakePattern`. They share one validator, the per-level range rules, and the same test style: generate many samples and check rules that must always hold.

**Files:** `utils/math.ts`, `utils/shuffle.ts`, `utils/ids.ts`, `utils/validation.ts`, `services/difficultyRules.ts`, `services/questionGenerator.ts`, `services/distractors.ts`, `services/similarQuestionGenerator.ts`, plus a small `services/explanations.ts` for the "brief explanation" on the card back (spec 6.3).

**Depends on:** types only.

### Automated tests
| File | Cases |
|---|---|
| `utils/math.test.ts` | `randomInt` stays inside its inclusive bounds over 10,000 draws and hits both ends; min equal to max returns that value |
| `utils/shuffle.test.ts` | Same items after shuffling, input array not changed, each position gets the first item 15 to 35% of the time over 4,000 runs |
| `utils/ids.test.ts` | 10,000 ids are all unique |
| `services/questionGenerator.test.ts` | For each of the 16 operation and level pairs, 500 samples: operands are in the spec section 7 range. Addition sum is at most 20 at L1 and at most 100 at L2. Subtraction answer is never negative at L1 to L3. Multiplication factors match the digit rules at L3 and L4. Division divisor is never 0, dividend = divisor × quotient, answer is a whole number, and the L3 dividend is at most 144. `displayText` uses + − × ÷ and `correctAnswer` is right. Mixed operations: a random operation is picked from the enabled list |
| `services/distractors.test.ts` | Exactly 4 choices, all unique, correct answer appears once, all integers, no negatives when not allowed. Answers near zero (0 + 0, 5 − 5, 0 × 3, 0 ÷ 4) still give 4 valid choices. A degenerate case still returns within the retry limit. Over 2,000 questions the correct answer sits in each position 15 to 35% of the time |
| `utils/validation.test.ts` | Rejects: 3 or 5 choices, duplicate choices, missing correct answer, division by 0, fractional answer, operands outside the level, unknown operation |
| `services/similarQuestionGenerator.test.ts` | For each operation: the result is valid, `source` is `"mistake-review"`, `mistakePatternId` is set, and the level matches. Reversed operands only for + and ×. A × mistake can produce ÷ (56 ÷ 7, 56 ÷ 8) and ÷ can produce ×. + can produce − and − can produce +. Nearby numbers stay inside the level range. The exact original question is under 20% of 50 calls |
| `services/explanations.test.ts` | Returns a short string for each operation, for example "8 × 7 means 8 groups of 7" and "56 ÷ 7 = 8 because 7 × 8 = 56" |

### Confirm
```bash
npm test -- src/utils src/services
```
There is nothing to check by hand, since this group has no UI. Read a few sample outputs if you like: `npm test -- questionGenerator --reporter=verbose`.

---

## G2. Storage and mistake records (Wave 1)

**Phases:** 9, 12

Both phases read and write the `mathPractice.*` keys in localStorage and validate records. Phase 9 builds the generic service (read, write, validate, migrate, clear). Phase 12 is the first record type that runs through it, with the create and update rules for mistake patterns.

**Files:** `services/storageService.ts`, `services/storageKeys.ts`, `services/storageValidators.ts`, `services/migrations.ts`, `services/defaults.ts`, `services/practiceRecords.ts`, `services/mistakeService.ts`.

**Depends on:** types only. G1 and G2 touch no shared files.

### Automated tests
| File | Cases |
|---|---|
| `services/storageService.test.ts` | A missing key returns the default. Write then read returns the same data. Invalid JSON in one key resets only that key and leaves the others alone. If `getItem` throws (storage unavailable), the service returns defaults and sets `storageAvailable = false` without throwing. If `setItem` throws a quota error, it returns a failure result without throwing. Keys without the `mathPractice.` prefix are never touched. `clearCategory` and `clearAll` only remove `mathPractice.*` keys |
| `services/migrations.test.ts` | Data with no version is migrated and `mathPractice.version` is written as `{ "version": 1 }`. Data with an older version runs its migration step. Data already at the current version is left unchanged |
| `services/storageValidators.test.ts` | Settings with wrong types fall back to defaults field by field. Invalid entries in an array (attempts, sessions, patterns) are dropped and valid ones are kept. A wrong top-level shape resets that category only |
| `services/mistakeService.test.ts` | A wrong answer creates a pattern with every spec 6.4 field, `incorrectCount` 1 and `similarCorrectCount` 0. Missing the same fact again raises `incorrectCount`, updates `lastIncorrectAt`, and creates no duplicate. 7 × 8 and 8 × 7 count as the same pattern (decision D2). A new miss on a mastered pattern makes it active again (decision D3). Patterns survive a save and reload |

### Confirm
```bash
npm test -- src/services/storage src/services/migrations src/services/mistake
```
Manual: none. Storage has no UI until G3.

---

## G3. Configuration forms (Wave 2)

**Phases:** 3, 11

Both phases are forms built from the same selector components. The Settings page reuses the operation, difficulty and session-length selectors from Practice Setup to choose its defaults, so the selectors get built once and used twice.

**Kickoff (Opus, before the wave starts):** build the shared `components/common/ConfirmDialog.tsx` and `EmptyState.tsx`, and add any new `AppSettings` fields from decisions D1 and D7, so G3 and G4 don't both change them.

**Files:** `components/setup/OperationSelector.tsx`, `DifficultySelector.tsx`, `SessionLengthSelector.tsx`, `pages/PracticeSetupPage.tsx`, `pages/SettingsPage.tsx`, `hooks/useLocalStorage.ts`, `hooks/useSettings.ts`.

**Depends on:** G2 (settings persistence).

### Automated tests
| File | Cases |
|---|---|
| `components/common/ConfirmDialog.test.tsx` | Opens with `role="alertdialog"` and the given message. Focus moves into the dialog. Escape and Cancel both call `onCancel`. Confirm calls `onConfirm`. Focus returns to the trigger button |
| `components/setup/OperationSelector.test.tsx` | Several operations can be picked. "All operations" picks all four. Each selected item has a checked state plus a text or icon marker, not just a color. Space toggles a focused option |
| `components/setup/DifficultySelector.test.tsx` | Exactly one level can be picked. The labels Beginner, Easy, Intermediate and Advanced each have a description. Arrow keys move between levels |
| `components/setup/SessionLengthSelector.test.tsx` | Options 5, 10, 20 and Continuous. The default comes from settings |
| `pages/PracticeSetupPage.test.tsx` | Start Session is disabled with no operation selected and shows a validation message. It turns on once an operation is picked. Clicking it passes the chosen config and goes to `/practice/session` |
| `pages/SettingsPage.test.tsx` | Each toggle saves to localStorage right away. Changing the default difficulty shows up on the Setup page. Clear All Data asks first: Cancel keeps the data, Confirm clears it, restores defaults and returns to Home |

### Confirm
```bash
npm test -- src/components/common src/components/setup src/pages/PracticeSetup src/pages/Settings
```
Manual (`npm run dev`):
1. On Setup, use only Tab and Space to pick operations, a level and a length. Start Session turns on.
2. Change the defaults in Settings and reload the page. The Setup page shows the new defaults.
3. Use Clear All Data, cancel once, then confirm.

---

## G4. Statistics (Wave 2)

**Phases:** 10, 15

Both phases follow the same pattern: a pure calculation function plus a card-style display. Phase 10 covers totals by operation and level, and Phase 15 covers mistake statistics. They share a `StatCard` component, accuracy formatting, and the empty states.

**Files:** `services/statisticsService.ts`, `services/mistakeStatistics.ts`, `components/statistics/*` (spec section 19 names), `pages/StatisticsPage.tsx`, `hooks/useStatistics.ts`.

**Depends on:** G2 (it reads attempts, sessions and patterns from storage). Tests use seeded storage, so it doesn't need G5.

### Automated tests
| File | Cases |
|---|---|
| `services/statisticsService.test.ts` | Zero attempts give 0%, never NaN. Recording an attempt updates the overall, by-operation and by-level counts. All correct is 100%, all incorrect is 0%, and 2 of 3 is 67%. Recent sessions are sorted newest first. Inputs are never changed |
| `services/mistakeStatistics.test.ts` | Counts active and mastered patterns. Finds the most-missed operation, and on a tie returns every tied operation. Lists the top missed facts sorted by `incorrectCount`. Counts how many similar questions were practiced and how many were answered right. No patterns returns an empty result |
| `pages/StatisticsPage.test.tsx` | Empty storage shows the friendly empty state. Seeded data shows the right overall totals, 4 operation cards and 4 labeled level cards. Recent sessions are newest first. Mistake stats appear. Active and mastered patterns can be viewed separately |
| `components/statistics/ResetStatistics.test.tsx` | Clicking Reset shows the exact spec message, "Are you sure you want to erase all practice history and statistics?". Cancel keeps the data. Confirm clears attempts, sessions, stats and patterns (decision D4), shows zeros, and keeps the settings |

### Confirm
```bash
npm test -- src/services/statistics src/services/mistakeStatistics src/pages/Statistics src/components/statistics
```
Manual: seed sample data from the browser console with a snippet provided in the group's report, open `/statistics`, check the numbers, then try Reset with both Cancel and Confirm. Narrow the window to phone width: the tables become stacked cards.

---

## G5. Practice flow (Wave 3)

**Phases:** 6, 7, 8, 14

This is the main loop: the question card, the session state machine, the summary page, and review mode as a second question source for the same machine. The session logic is a pure reducer in `usePracticeSession`, so most behavior can be tested without rendering. Build the card with the spec section 14 requirements from the start (real buttons, `aria-expanded` and a live region, a reduced-motion fallback), so G6 is mostly checking rather than rework.

**Files:** `app/AppProvider.tsx`, `hooks/usePracticeSession.ts`, `services/reviewSessionBuilder.ts`, `services/reviewPriority.ts`, `components/practice/*` (spec section 19), `pages/PracticePage.tsx`, `pages/SessionSummaryPage.tsx`, plus the review-mode option on `PracticeSetupPage.tsx`.

**Depends on:** G1, G2 and G3.

### Automated tests
| File | Cases |
|---|---|
| `hooks/practiceReducer.test.ts` | Start creates a session with an id, start time, operations, level and length, plus a first question. Selecting an answer is ignored after the flip. Flip is ignored with no answer picked. Recording is ignored unless an answer is picked and the card is flipped, and two record actions count only once. A flipped card with no Right or Wrong choice stores no attempt, even if End Session is used (spec 18). Right and wrong update the totals. A wrong answer creates or updates a mistake pattern. A right answer in review mode raises `similarCorrectCount`. The next question is never identical to the last one. A fixed-length session completes when attempted equals its length and gets `completedAt`. A continuous session only ends on End Session |
| `services/reviewPriority.test.ts` | Higher `incorrectCount` ranks first. A more recent miss ranks first. Fewer similar-correct answers rank first. Ties are randomized (both orders show up when `Math.random` is mocked). Mastered patterns are left out |
| `services/mastery.test.ts` | A pattern is mastered at the 3rd similar-correct answer, not the 2nd. A threshold of 5 from settings is respected. A mastered pattern comes back after a new miss |
| `services/reviewSessionBuilder.test.ts` | Picks only active patterns. Mixes several patterns in one session. Every question carries its `mistakePatternId` |
| `components/practice/AnswerChoice.test.tsx` | Selected state uses `aria-pressed` plus a visible marker. Disabled after the flip |
| `components/practice/QuestionCard.test.tsx` | The front shows the question, 4 choices and "Question X of Y". Flip is disabled until an answer is picked, and the answer can be changed before flipping. The back shows the question, the correct answer, your answer, an explanation (when the setting is on), and the Right and Wrong buttons. The live region announces the correct answer. After one result button is clicked, both are disabled. With animation off, the content still switches |
| `components/practice/ProgressBar.test.tsx` | Has `role="progressbar"` with `aria-valuenow` and `aria-valuemax`. Updates after each attempt. Hidden in continuous mode |
| `pages/PracticePage.test.tsx` | With no session, it redirects to Setup. Finishing the last question goes to Summary. Continuous mode shows End Session and asks before ending |
| `pages/SessionSummaryPage.test.tsx` | Shows attempted, correct, incorrect, accuracy, operations, level and the review count. Practice Again restarts with the same config. Practice Mistakes is disabled when there are no active patterns. Change Settings, View Statistics and Return Home navigate. Opening it with no finished session shows a message and a Home button |
| `pages/PracticeSetupPage.review.test.tsx` | Review mode is disabled, with an explanation, when there are no active patterns. It shows the active pattern count when there are some |

### Confirm
```bash
npm test -- src/hooks src/services/review src/services/mastery src/components/practice src/pages
```
Manual (this is Milestone 2 plus Milestone 4 in the browser):
1. Play a 5-question addition session. Pick, flip, mark Right or Wrong, and finish on the Summary page.
2. Mark one question Wrong, start a review session, and confirm that a related question appears.
3. Answer 3 related questions right, then start review again. That pattern is now mastered and no longer appears.
4. In continuous mode, End Session asks first and then shows the summary.

---

## G6. UX quality (Wave 4)

**Phases:** 16, 17

Both phases are passes over screens that already exist rather than new features: keyboard shortcuts, screen-reader announcements, reduced motion, contrast, the tablet and phone layouts, and child-friendly feedback messages. Doing them in one pass means each component gets reviewed once against both lists.

**Files:** `components/practice/*`, CSS modules, `components/layout/Navigation.tsx` (simple mobile menu), `services/feedbackMessages.ts`.

**Depends on:** G5. Runs in parallel with G7 under the file split described above.

### Automated tests
| File | Cases |
|---|---|
| `components/practice/keyboard.test.tsx` | Keys 1 to 4 pick answers 1 to 4. The shortcuts are ignored while typing in an input and after the flip. Enter and Space activate the focused button |
| `components/practice/announcements.test.tsx` | A new question, the revealed answer and progress changes are each announced through `aria-live` |
| `components/practice/reducedMotion.test.tsx` | With `matchMedia('(prefers-reduced-motion: reduce)')` mocked, or the animation setting off, there is no flip animation class and the content still changes |
| `services/feedbackMessages.test.ts` | Right answers get positive messages and wrong answers get supportive ones. No message contains shaming words. Messages vary without repeating twice in a row. Turning the setting off means no message |
| `components/layout/Navigation.test.tsx` | The small-screen menu button has `aria-expanded` and an accessible name, and opens and closes the menu |

### Confirm
```bash
npm test -- src/components src/services/feedbackMessages
```
Manual:
1. Finish a whole session using only the keyboard.
2. Turn on reduced motion in the OS. The card switches with no flip.
3. Zoom the browser to 200%, and try phone (320px) and tablet portrait and landscape widths in devtools. There should be no sideways scrolling.
4. Set a larger default font size in the browser settings (for example, Chrome's "Very large"). Text grows and nothing overlaps or gets cut off.
5. Spot-check with a screen reader (NVDA on Windows).

---

## G7. Robustness (Wave 4)

**Phases:** 18, 19, 21

All three phases harden the app against real-world conditions: refreshing mid-session, accidentally navigating away, corrupted or missing data, generation failures, large histories, and load time. They touch the same places: storage, the app root, and the practice page.

**Files:** `services/activeSessionStore.ts`, `services/historyCompaction.ts`, `components/common/ErrorBoundary.tsx`, `components/common/ErrorMessage.tsx`, `components/common/StorageWarning.tsx`, `pages/PracticePage.tsx` (blocker), `app/routes.ts` (lazy-loaded pages).

**Depends on:** G5.

### Automated tests
| File | Cases |
|---|---|
| `services/activeSessionStore.test.ts` | An active session, its current question and the selected answer are saved and restored. They are cleared when the session ends |
| `pages/PracticePage.recovery.test.tsx` | After unmounting and remounting with the same localStorage (a simulated refresh), the session resumes at the same question |
| `pages/PracticePage.blocker.test.tsx` | Using `createMemoryRouter`, clicking a nav link mid-session asks first. Stay keeps the session. Leave ends it and navigates away. There is no prompt after the session is complete |
| `components/common/ErrorBoundary.test.tsx` | When a child throws, a friendly message and a Home button appear, with no stack trace on screen |
| `components/common/StorageWarning.test.tsx` | Unavailable or full storage shows a friendly warning, and the session keeps working |
| `services/questionGenerator.fallback.test.ts` | When a generator is mocked to return invalid questions, it retries up to the limit, then returns a valid fallback and logs a warning in development |
| `services/storageValidators.recovery.test.ts` | Each of corrupted settings, attempts, sessions and patterns resets only its own category |
| `services/historyCompaction.test.ts` | 5,000 attempts load and save in under a set time. Old attempts are trimmed past the limit (decision D6) while the aggregate statistics stay the same. Sessions are capped |

### Confirm
```bash
npm test -- src/services/activeSession src/services/historyCompaction src/services/questionGenerator src/services/storageValidators src/components/common src/pages/PracticePage
npm run build
```
Manual:
1. Refresh in the middle of a session. It resumes where you were.
2. Click Statistics mid-session, choose Stay, then try again and choose Leave.
3. In devtools, set `mathPractice.settings` to `garbage` and reload. Settings reset, and your stats are still there.
4. Compare the build output size before and after lazy-loading the Statistics and Settings pages.
5. To mimic a slower device, open devtools Performance, set CPU to 4x slowdown and Network to Slow 4G, then reload. The first page appears quickly and card flips stay smooth.

---

## G8. Verify and ship (Wave 5)

**Phases:** 20, 22

This group finishes testing: the spec section 21.3 integration flows, an automated accessibility checker, and filling any coverage gaps. It also prepares the release: a privacy review, browser testing, the production build and deployment.

**Files:** `src/test/integration/*.test.tsx`, an axe-based check (for example `vitest-axe`), hosting config for SPA routing.

**Depends on:** everything else.

### Automated tests
| File | Cases |
|---|---|
| `test/integration/practiceFlow.test.tsx` | Spec 21.3, all 8 steps: start a session, pick an answer, flip, mark it incorrect, check that stats updated, check that a pattern was stored, start review mode, and check that a similar question appears. Then miss the same fact again and check that the same pattern now has `incorrectCount` 2 |
| `test/integration/sessions.test.tsx` | A full addition session. A mixed-operation session. Continuous practice. Mastery reached after 3. Persistence after a remount. Reset Statistics |
| `test/integration/edgeCases.test.tsx` | Spec 21.4: no stored data, corrupted data, zero attempts, all correct, all incorrect |
| `test/a11y.test.tsx` | Every page has no axe violations |

### Confirm
```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```
Manual:
1. Test in Chrome, Firefox, Edge and Safari (or WebKit), on a tablet emulator and on a phone.
2. Do a privacy check: no network requests while practicing (watch the devtools Network tab).
3. After deploying, open every route directly by URL and confirm that progress survives a reload.
4. Go through every issue the axe check reports and every note from the G6 manual checks. Fix each one or record why it is acceptable.

### Phase 20 checkbox map

Tasks 79 and 80 are covered by tests written in earlier groups. Tick each box once the test listed here passes; G8 only reruns them and fills gaps.

| Phase 20 item | Covered by |
|---|---|
| 79 arithmetic generators, difficulty boundaries | G1 `questionGenerator.test.ts` |
| 79 distractor generation, answer-choice uniqueness | G1 `distractors.test.ts`, `utils/validation.test.ts` |
| 79 statistics calculations | G4 `statisticsService.test.ts` |
| 79 mistake-pattern updates | G2 `mistakeService.test.ts`, G8 `practiceFlow.test.tsx` |
| 79 similar-question generation | G1 `similarQuestionGenerator.test.ts` |
| 79 mastery rules | G5 `mastery.test.ts` |
| 79 storage serialization and validation | G2 `storageService.test.ts`, `storageValidators.test.ts` |
| 80 operation selection, difficulty selection | G3 `OperationSelector.test.tsx`, `DifficultySelector.test.tsx` |
| 80 answer selection, card flipping, right and wrong buttons | G5 `AnswerChoice.test.tsx`, `QuestionCard.test.tsx` |
| 80 progress updates, session completion | G5 `ProgressBar.test.tsx`, `PracticePage.test.tsx` |
| 80 statistics display | G4 `StatisticsPage.test.tsx` |
| 80 confirmation dialogs | G3 `ConfirmDialog.test.tsx`, G4 `ResetStatistics.test.tsx` |
| 81 all integration items | G8 `practiceFlow.test.tsx`, `sessions.test.tsx` |
| 82 keyboard, screen reader, reduced motion, zoom | G6 manual checks |
| 82 automated checker, review issues | G8 `a11y.test.tsx`, manual item 4 |

---

## Spec section 21 coverage

| Spec test | Group |
|---|---|
| 21.1 Generators for +, −, ×, ÷, difficulty boundaries, distractors, uniqueness, shuffling | G1 |
| 21.1 Similar-question generation | G1 |
| 21.1 Statistics and accuracy | G4 |
| 21.1 Mastery rules | G5 |
| 21.1 Local-storage serialization | G2 |
| 21.2 Answer selection, flip, right and wrong buttons, front and back, progress, completion | G5 |
| 21.2 Statistics display, reset dialog | G4 |
| 21.3 Full integration flow | G8 |
| 21.4 No data, corrupted data | G2, G7, G8 |
| 21.4 Zero attempts, all correct, all incorrect | G4, G8 |
| 21.4 Continuous practice | G5 |
| 21.4 Refresh during a session | G7 |
| 21.4 Duplicate distractors, division by zero | G1 |
| 21.4 Very small widths | G6 (manual) |

## Decisions needed (recommended defaults)

The spec leaves these open. I'll use the recommended default unless you say otherwise.

| # | Question | Recommended | Needed by |
|---|---|---|---|
| D1 | Level 4 negative subtraction ("optional" in spec 7.4) | Add an `allowNegativeSubtraction` setting, off by default, that only affects Level 4 | G1 |
| D2 | Do 7 × 8 and 8 × 7 (and 3 + 4 and 4 + 3) count as one mistake pattern? | Yes, store the operands in sorted order for + and × | G2 |
| D3 | What happens when you miss a pattern again? | Set `similarCorrectCount` back to 0 and `mastered` to false | G2 |
| D4 | Does Reset Statistics also clear mistake patterns? | Yes, since they are practice history. Settings are kept | G4 |
| D5 | Invalid stored records | Drop only the invalid entries in an array, and reset a category only when its JSON can't be read | G2 |
| D6 | History limits | Keep the last 50 sessions and 2,000 attempts in detail. Aggregate stats keep counting everything | G7 |
| D7 | Sound effects (a setting exists, but the spec includes no sounds) | A short Web Audio tone for each result, with no audio files and the setting respected | G3 settings field, G5 sound |
| D8 | Hosting for deployment | Decide at G8 (GitHub Pages, Netlify or Vercel) | G8 |
