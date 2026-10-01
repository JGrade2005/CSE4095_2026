# Class 10: Comparing Models Fairly

Notebook: `CSE4095_Class10_Starter.ipynb`. Dataset: `class1_student_habits.csv` (same folder).
Also read `~/agenticlibrary/context.md` for general work practices.

## Ground rules (apply to every step)

1. **Test set is off limits until "Part 15".** `X_test` and `y_test` must NOT be used for any model comparison, tuning, or experiment until the user explicitly says "Part 15". If a step would touch the test set before then, stop and tell the user instead.
2. **One CV splitter for everything.** Use `cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`, stored in the single variable `cv`, for ALL cross-validation so every model is evaluated on identical folds.
3. **`random_state=42`** wherever applicable.
4. **Keep it simple and beginner-readable.** No extra models, hyperparameters, or automated searches (no `GridSearchCV` / `RandomizedSearchCV`).
5. **Part structure.** For each Part add, in order:
   - a Markdown header cell: `## Part N — Title`
   - the code cells
   - a Markdown cell listing that Part's questions, each followed by a `**My answer:**` placeholder.
   Do NOT write answers to conceptual questions. The user writes those.
6. **Execute after every Part.** Run the notebook top to bottom and confirm it runs without errors.

## Environment and data notes

- Run with `.venv/bin/python` (pandas, numpy, matplotlib, scikit-learn, ipykernel, nbclient). Execute with nbclient.
- Read the CSV with `keep_default_na=False, na_values=[""]`. The default turns the valid category "None" in `prior_programming_experience` into NaN.
