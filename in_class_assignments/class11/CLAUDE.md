# Class 11: Feature Engineering, Feature Selection and RandomizedSearchCV

Handout: `class11_assignment.md`. Checklist: `requirements.md`. Also read `~/agenticlibrary/context.md` for general work practices.
If the library conflicts with these rules, these rules win.

## Ground rules (apply to every step)

1. **Notebook:** `class11_feature_engineering.ipynb`. Dataset: https://raw.githubusercontent.com/plotly/datasets/master/auto-mpg.csv. Target: `mpg` (regression).
2. **One split.** One 80/20 train/test split with `random_state=42`, created in Part 2 and reused everywhere.
3. **TEST SET LOCK.** `X_test` and `y_test` may not be used for feature engineering, importance, selection, tuning or experiments. They stay locked until the user types exactly `UNLOCK TEST SET`. If any step would touch them before that, stop and tell the user.
   - Status: **LOCKED**
4. **One CV object.** `cv = KFold(n_splits=5, shuffle=True, random_state=42)` for all cross-validation. MAE is the primary metric, reported as a positive number (flip the sign of `neg_mean_absolute_error`). Always report the mean and the std across folds.
5. **No leakage.** All preprocessing (imputing missing horsepower, etc.) lives inside a Pipeline so CV never leaks. Engineered features come from one row-wise function `add_features(df)` that learns nothing from the data, so it is leakage-free. Say so in a code comment.
6. **`random_state=42`** everywhere it applies. Simple, beginner-readable code. Reuse helper functions instead of copy-pasting.
7. **Part structure.** A Markdown header `## Part N — Title`, the code cells, then a Markdown cell listing that Part's questions verbatim, each followed by an empty `**My answer:**`. NEVER write the user's answers in the notebook.
8. **answerGuide.md.** After each Part, answer-drafter adds a section for that Part (format in rule 12). Drafts cite real numbers from the executed notebook. Every entry is marked `DRAFT — rewrite in your own words`.
9. **DECISION GATES.** At a gate, STOP. Show the evidence and the options neutrally, with no recommendation unless asked. Leave a variable such as `engineered_features = None  # TODO: set by me` in the notebook. Continue only after the user replies, then record the gate in `decisions.md` (options, evidence shown, user's choice, user's reason).
   - Gates: engineered features (Part 5), candidate subsets (Part 11), final feature set (Part 13), search ranges (Part 15), experiment hypothesis (Part 23).
10. **chatLog.md.** After each concept question or AI suggestion, append a factual entry in the user's style (`### N. Title`, `**Me:**`, `**AI:**` with a 1-3 sentence summary). Only log exchanges that really happened.
11. **Execute after each Part.** nb-coder runs `jupyter nbconvert --to notebook --execute --inplace class11_feature_engineering.ipynb` (use `.venv/bin/jupyter`). Report errors and warnings, then tick off the matching items in `requirements.md`.
12. **answerGuide.md entry format per question:** Question / Draft answer (2-5 sentences) / Evidence (cell + numbers) / Key concept (1 line) / Watch out (common mistake, 1 line).

## Subagents (`.claude/agents/`)

| Agent | Model | Job |
| --- | --- | --- |
| `nb-scout` | haiku | Read-only: parse files, inspect data, grep notebook, list placeholders, checklist audits. Never edits. |
| `nb-coder` | sonnet | Write/edit notebook cells from a spec, execute, fix errors, report changes. |
| `answer-drafter` | sonnet | Draft answerGuide.md entries from numbers/plots in the executed notebook only. |

Routing: one narrow task per subagent, exact file paths, exact output format. The lead keeps decision-gate prep, leakage review, concept explanations, and the final review of every subagent's output. If a subagent's result can't be verified, say so instead of passing it on.

## Environment

- Python: `.venv/bin/python` (system Python has no sklearn). Packages: pandas, numpy, matplotlib, scikit-learn, ipykernel, nbclient, nbconvert. `.venv/` is gitignored.

## Library conventions that still apply

- No em dashes in prose or code comments, except where these rules require them (`## Part N — Title`, `DRAFT — rewrite in your own words`).
- Brief explanations. Short comments. No dead code or unused imports. No tests unless asked.
- Never rewrite the user's own answers; flag factual problems instead.
- If asked to do Parts across a gate or the test lock, build up to the gate, then stop and ask.
- End each session with a log in `~/agenticlibrary/sessions/`.
