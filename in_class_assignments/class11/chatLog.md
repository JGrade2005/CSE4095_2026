# Chat Log: Class 11, feature engineering, selection and RandomizedSearchCV

How the conversation with the AI coding agent (Claude Code) went, turn by turn. Work files are in `~/CSE4095_2026/in_class_assignments/class11`.

---

## 2026-10-06

### 1. Kickoff: ground rules, subagents and setup
**Me:** Start Class 11. Read my agentic library and the handout, create the nb-scout, nb-coder and answer-drafter subagents, write CLAUDE.md with 12 ground rules (test set locked until "UNLOCK TEST SET", one KFold `cv`, MAE as a positive number, preprocessing inside a Pipeline, decision gates), set up the log files and the first notebook cells, then ask my questions in one batch.
**AI:** Did the setup, fixed gaps in the Haiku-generated requirements.md (non-verbatim and missing questions in Parts 10, 12, 17, 24, 25), and built a `.venv` because system Python has no scikit-learn. The notebook runs cleanly on scikit-learn 1.9.1. It noted that the dataset has 398 rows, 6 numeric predictors and only 2 missing horsepower values, then asked its kickoff questions.

### 2. Kickoff answers and Part 1
**Me:** Rename `model-year` to `model_year`, save the data as a CSV the notebook can use, and never commit or push (I do all git). I'll give each Part's prompt myself, so don't run ahead. Then build Part 1: inspection cells, an mpg histogram with mean and median lines, a 2x3 grid of mpg vs each feature, and the questions.
**AI:** Saved `auto-mpg.csv` next to the notebook, which reads the local file in VS Code and falls back to the URL in Colab. Part 1 shows 398 cars, 7 numeric columns, no text or car name column, and only 2 missing horsepower values. mpg has mean 23.5 and median 23.0, and the scatter grid shows curved relationships for displacement and horsepower.
