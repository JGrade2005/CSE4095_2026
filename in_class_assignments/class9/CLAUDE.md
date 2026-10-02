# Class 9: Regression and Model Error

Notebook: `CSE4095_Class3_Starter.ipynb`. Dataset: `class1_student_habits.csv` (same folder).
Target: `exam_score` as a number. Do NOT convert it to Yes/No.
Also read `~/agenticlibrary/context.md` for general work practices.

## Ground rules (apply to every step)

1. **One split for everything.** Create one 80/20 train/test split with `random_state=42` and reuse that exact split for every model and experiment so comparisons are fair.
2. **Fit once, evaluate once.** Each planned model is fit on the training data and evaluated on the test set once. Never tweak a model or try extra variations to improve the test score. If a request would do that, tell the user instead of doing it.
3. **Keep it simple and beginner-readable.** No extra models, hyperparameter tuning, or cross-validation unless the user asks.
4. **RMSE** is computed as `np.sqrt(mean_squared_error(...))`. Do not use `squared=False` (deprecated).
5. **Part structure.** For each Part add, in order:
   - a Markdown header cell: `## Part N — Title`
   - the code cells
   - a Markdown cell listing that Part's questions, each followed by a `**My answer:**` placeholder.
   Do NOT write answers to interpretation questions. The user writes those.
6. **Execute after every Part.** Run the notebook top to bottom and confirm it runs without errors.

## Environment and data notes

- Run with `../class10/.venv/bin/python` (pandas, numpy, matplotlib, scikit-learn, ipykernel, nbclient). Execute with nbclient.
- Read the CSV with `keep_default_na=False, na_values=[""]`. The default turns the valid category "None" in `prior_programming_experience` into NaN.

## Answer guide

- `answerGuide.md` holds talking points and evidence for every Part's questions (same style as `class10/answerGuide.md`). Add a section for each new Part. The notebook's "**My answer:**" placeholders stay empty.

## Notebook layout

- Title, Setup, then Parts in order. Starter sections (`## N. ...` plus TODO cell) that a Part covers are removed. Uncovered ones stay below the Parts.
- `numeric_features` / `categorical_features` are defined at the start of Part 4 (5 numeric incl. commute_minutes, 2 categorical). student_id, quiz_average, exam_score are not features.
