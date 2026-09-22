# =====================================================================
# CSE 4095 - Class 7: Exploring class1_student_habits.csv
# Upload the CSV to the Colab file sidebar first, then run.
# Works pasted into one cell, or split at the separators below.
# =====================================================================

import pandas as pd
from IPython.display import display

# "None" is a real category in prior_programming_experience (None/Some/Strong).
# pandas treats the string "None" as missing by default, which would silently
# delete 88 valid answers, so only blank cells count as missing here.
df = pd.read_csv("class1_student_habits.csv", keep_default_na=False, na_values=[""])


def header(title):
    """Print a labeled divider so each block of output explains itself."""
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


# ---------------------------------------------------------------------
# First look
# ---------------------------------------------------------------------
header("FIRST 5 ROWS (one row = one student)")
display(df.head())


# ---------------------------------------------------------------------
# Size of the dataset
# ---------------------------------------------------------------------
header("DATASET SIZE")
print(f"Rows    (students in the dataset): {df.shape[0]}")
print(f"Columns (variables recorded):      {df.shape[1]}")


# ---------------------------------------------------------------------
# Column names
# ---------------------------------------------------------------------
header("COLUMN NAMES")
for i, name in enumerate(df.columns):
    print(f"Column {i}: {name}")


# ---------------------------------------------------------------------
# Data type and missing values for every column
# ---------------------------------------------------------------------
header("DATA TYPE AND MISSING VALUES, BY COLUMN")
print("'missing' counts blank cells only. No rows are deleted.\n")

summary = pd.DataFrame({
    "dtype": df.dtypes,
    "non_null_count": df.notna().sum(),
    "missing_count": df.isna().sum(),
    "missing_percent": (df.isna().mean() * 100).round(2),
})
summary.index.name = "column"
display(summary)

total_missing = int(df.isna().sum().sum())
n_cols_missing = int((df.isna().sum() > 0).sum())
print(f"{total_missing} missing cells in total, spread across "
      f"{n_cols_missing} of the {df.shape[1]} columns.")
print(f"That is {total_missing} of {df.size} total cells "
      f"({total_missing / df.size * 100:.2f}%).")


# ---------------------------------------------------------------------
# Classify the columns
# ---------------------------------------------------------------------
identifier  = ["student_id"]
numerical   = ["study_hours_per_week", "sleep_hours_per_night", "attendance_rate",
               "practice_problems_per_week", "commute_minutes",
               "quiz_average", "exam_score"]
categorical = ["prior_programming_experience", "study_group"]

header("COLUMN CLASSIFICATION")
print(f"Identifier  ({len(identifier)}): {', '.join(identifier)}")
print(f"   -> {df['student_id'].nunique()} unique IDs for {len(df)} rows, so it labels")
print(f"      rows rather than measuring anything. Exclude it from statistics.\n")

print(f"Numerical   ({len(numerical)}):")
for c in numerical:
    print(f"   - column {df.columns.get_loc(c)}: {c:<28} {df[c].dtype}")

print(f"\nCategorical ({len(categorical)}):")
for c in categorical:
    print(f"   - column {df.columns.get_loc(c)}: {c:<28} {df[c].nunique()} categories")


# ---------------------------------------------------------------------
# What is inside each categorical column
# ---------------------------------------------------------------------
header("CATEGORY BREAKDOWN (categorical columns)")

for c in categorical:
    counts = df[c].value_counts(dropna=False)
    labels = ["(blank - missing)" if pd.isna(v) else v for v in counts.index]
    table = pd.DataFrame({
        "category": labels,
        "students": counts.values,
        "percent_of_250": (counts.values / len(df) * 100).round(1),
    })
    print(f"\n{c}  -  how many students gave each answer:")
    print(table.to_string(index=False))


# ---------------------------------------------------------------------
# Descriptive statistics for the numerical columns
# ---------------------------------------------------------------------
header("DESCRIPTIVE STATISTICS (numerical columns)")
print("'count' is the number of students with a value for that column,")
print("so a count below 250 means that column has blanks. Nothing was dropped.\n")

stats = df[numerical].describe().T[["count", "mean", "50%", "std", "min", "max"]]
stats = stats.rename(columns={"50%": "median"}).round(2)
stats["count"] = stats["count"].astype(int)
stats.index.name = "column"
display(stats)


# ---------------------------------------------------------------------
# Quartiles, to show the spread and spot skew
# ---------------------------------------------------------------------
header("FULL FIVE-NUMBER SUMMARY (quartiles included)")
print("Compare mean vs 50% (median): a mean well above the median means right-skew,")
print("usually caused by a few unusually large values.\n")
display(df[numerical].describe().round(2))


# =====================================================================
# PART 4 - Filtering, Sorting, Grouping
# =====================================================================

# ---------------------------------------------------------------------
# A. Filtering: study >= 10 hrs/week AND attendance >= 90%
# ---------------------------------------------------------------------
header("A. HIGH-EFFORT STUDENTS (>= 10 study hrs/week AND >= 90% attendance)")

high_effort = df[(df["study_hours_per_week"] >= 10) & (df["attendance_rate"] >= 90)]

cols_a = ["student_id", "study_hours_per_week", "attendance_rate",
          "practice_problems_per_week", "prior_programming_experience",
          "study_group", "quiz_average", "exam_score"]

print(f"{len(high_effort)} of {len(df)} students meet both conditions "
      f"({len(high_effort) / len(df) * 100:.1f}%).")
print(f"Their mean exam score: {high_effort['exam_score'].mean():.2f}")
print(f"Everyone else's:       {df.loc[~df.index.isin(high_effort.index), 'exam_score'].mean():.2f}")

# A blank study_hours value fails the >= test, so those students are excluded
# rather than counted as not qualifying. Report how many that affects.
unknown = df["study_hours_per_week"].isna() & (df["attendance_rate"] >= 90)
print(f"\nNote: {unknown.sum()} student(s) had >= 90% attendance but a blank")
print("study_hours_per_week, so they could not be evaluated either way.")

display(high_effort[cols_a].sort_values("exam_score", ascending=False))


# ---------------------------------------------------------------------
# B. Sorting: 10 highest exam scores
# ---------------------------------------------------------------------
header("B. TOP 10 EXAM SCORES")

cols_b = ["student_id", "exam_score", "quiz_average", "study_hours_per_week",
          "attendance_rate", "practice_problems_per_week",
          "sleep_hours_per_night", "prior_programming_experience", "study_group"]

top10 = df.nlargest(10, "exam_score")[cols_b]
display(top10.reset_index(drop=True))

print("Top-10 averages vs the whole class:")
for c in ["exam_score", "quiz_average", "study_hours_per_week",
          "attendance_rate", "practice_problems_per_week"]:
    print(f"  {c:<28} top 10: {top10[c].mean():>6.2f}    class: {df[c].mean():>6.2f}")


# ---------------------------------------------------------------------
# C. Grouping: exam score by study-group participation
# ---------------------------------------------------------------------
header("C. EXAM SCORE BY STUDY-GROUP PARTICIPATION")

by_group = df.groupby("study_group")["exam_score"].agg(
    n_students="count",
    mean_exam="mean",
    median_exam="median",
    std_exam="std",
    min_exam="min",
    max_exam="max",
).round(2)
display(by_group)

gap = by_group.loc["Yes", "mean_exam"] - by_group.loc["No", "mean_exam"]
print(f"Difference in mean exam score (Yes - No): {gap:+.2f} points")
print(f"Standard deviation within each group:     ~{df['exam_score'].std():.2f} points")
print("The gap is far smaller than the spread inside either group.")

# The two groups may differ in other habits as well, which is why a raw gap
# cannot be read as an effect of the study group itself.
header("C (cont.) OTHER HABITS BY GROUP - possible confounders")
display(df.groupby("study_group")[numerical].mean().round(2))
