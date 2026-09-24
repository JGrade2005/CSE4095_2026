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


# =====================================================================
# PART 5 - Visualizations
# =====================================================================
import numpy as np
import matplotlib.pyplot as plt

# One palette, defined once, used by every figure.
SURFACE   = "#fcfcfb"   # chart background
PRIMARY   = "#0b0b0b"   # title ink
SECONDARY = "#52514e"   # subtitle ink
MUTED     = "#898781"   # axis labels and ticks
GRID      = "#e1e0d9"   # hairline gridlines
AXIS      = "#c3c2b7"   # baseline
BLUE      = "#2a78d6"   # series 1
ORANGE    = "#eb6834"   # series 2 (reference lines, trend lines)

plt.rcParams.update({
    "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE,
    "font.family": "sans-serif",
    "font.size": 10,
})


def style(ax, title, subtitle, xlabel, ylabel):
    """Apply the shared chart chrome: titles, axis labels, recessive grid."""
    ax.set_title(title, loc="left", fontsize=13, fontweight="600",
                 color=PRIMARY, pad=28)
    ax.text(0, 1.03, subtitle, transform=ax.transAxes,
            fontsize=10, color=SECONDARY)
    ax.set_xlabel(xlabel, fontsize=10.5, color=SECONDARY, labelpad=8)
    ax.set_ylabel(ylabel, fontsize=10.5, color=SECONDARY, labelpad=8)

    # Grid sits behind the data as a solid hairline, never dashed.
    ax.set_axisbelow(True)
    ax.grid(True, axis="both", color=GRID, linewidth=0.8)
    ax.tick_params(colors=MUTED, labelsize=9.5, length=0)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(AXIS)
        ax.spines[side].set_linewidth(0.8)


def scatter_vs_exam(xcol, title, subtitle, xlabel):
    """Scatter of one habit against exam score, with a least-squares trend line."""
    sub = df[[xcol, "exam_score"]].dropna()
    x, y = sub[xcol], sub["exam_score"]
    r = x.corr(y)

    fig, ax = plt.subplots(figsize=(8, 5.2))

    # 2px surface ring keeps overlapping students readable instead of a blob.
    ax.scatter(x, y, s=48, color=BLUE, alpha=0.75,
               edgecolors=SURFACE, linewidths=1.2, zorder=3,
               label=f"Student (n = {len(sub)})")

    slope, intercept = np.polyfit(x, y, 1)
    xs = np.array([x.min(), x.max()])
    ax.plot(xs, slope * xs + intercept, color=ORANGE, linewidth=2, zorder=4,
            label=f"Trend: {slope:+.2f} pts per unit  (r = {r:.2f})")

    style(ax, title, subtitle, xlabel, "Exam score (points)")
    leg = ax.legend(frameon=False, loc="lower right", fontsize=9.5)
    for text in leg.get_texts():
        text.set_color(SECONDARY)

    fig.tight_layout()
    plt.show()
    return r


# ---------------------------------------------------------------------
# Visualization 1 - Histogram of exam_score
# ---------------------------------------------------------------------
mean_exam = df["exam_score"].mean()
median_exam = df["exam_score"].median()

fig, ax = plt.subplots(figsize=(8, 5.2))

bins = np.arange(50, 105, 5)
ax.hist(df["exam_score"], bins=bins, color=BLUE,
        edgecolor=SURFACE, linewidth=1.5, zorder=3)   # surface gap, not a border

ax.axvline(mean_exam, color=ORANGE, linewidth=2, zorder=4,
           label=f"Mean = {mean_exam:.1f}   (median = {median_exam:.1f})")

style(ax,
      f"Exam scores are symmetric and centred near {mean_exam:.0f} points",
      f"All {df['exam_score'].notna().sum()} students · 5-point bins · "
      f"range {df['exam_score'].min():.1f} to {df['exam_score'].max():.1f}",
      "Exam score (points)",
      "Number of students")
ax.grid(False, axis="x")

leg = ax.legend(frameon=False, loc="upper right", fontsize=9.5)
for text in leg.get_texts():
    text.set_color(SECONDARY)

fig.tight_layout()
plt.show()


# ---------------------------------------------------------------------
# Visualization 2 - Study hours vs exam score
# ---------------------------------------------------------------------
r_study = scatter_vs_exam(
    "study_hours_per_week",
    "More weekly study hours track with higher exam scores",
    "Each dot is one student. 9 students with a blank study-hours value are omitted.",
    "Study hours per week",
)


# ---------------------------------------------------------------------
# Visualization 3 - Sleep vs exam score
# ---------------------------------------------------------------------
r_sleep = scatter_vs_exam(
    "sleep_hours_per_night",
    "Nightly sleep shows almost no relationship with exam score",
    "Each dot is one student. 12 students with a blank sleep value are omitted.",
    "Sleep hours per night",
)


# ---------------------------------------------------------------------
# Comparison of the two relationships
# ---------------------------------------------------------------------
header("WHAT THE TWO SCATTER PLOTS SHOW")
print(f"study_hours_per_week vs exam_score:  r = {r_study:+.3f}   "
      f"r^2 = {r_study ** 2:.3f}")
print(f"sleep_hours_per_night vs exam_score: r = {r_sleep:+.3f}   "
      f"r^2 = {r_sleep ** 2:.3f}")
print("\nr^2 is the share of variation in exam score that the habit accounts for.")
print("Neither plot establishes cause: these are observed habits, not assigned ones.")


# =====================================================================
# PART 6 - Focused investigation: quiz_average vs exam_score
#
# PREDICTION (written before looking at the result):
#   I expect quiz_average to be associated with exam score because both
#   measure the same underlying thing - how well a student has learned the
#   course material - using the same kind of task, only weeks apart. A
#   student who has understood the material should demonstrate it on both.
# =====================================================================

# --- 1. Visualization ------------------------------------------------
r_quiz = scatter_vs_exam(
    "quiz_average",
    "Quiz average is the strongest single predictor of exam score",
    "Each dot is one student. All 250 students have both scores, so none are omitted.",
    "Quiz average (points)",
)

# --- 2. Correlation --------------------------------------------------
header("CORRELATION: quiz_average vs exam_score")
print(f"Pearson r          = {r_quiz:+.3f}")
print(f"r squared          = {r_quiz ** 2:.3f}  "
      f"({r_quiz ** 2 * 100:.1f}% of exam-score variation accounted for)")
print(f"Students compared  = {df[['quiz_average', 'exam_score']].dropna().shape[0]}")

slope, intercept = np.polyfit(df["quiz_average"], df["exam_score"], 1)
residuals = df["exam_score"] - (slope * df["quiz_average"] + intercept)
print(f"\nFitted line        : exam = {slope:.3f} x quiz + {intercept:.2f}")
print(f"Typical miss       : {residuals.std():.2f} points "
      f"(std of the vertical distance from the line)")
print(f"\nInterpretation: 10 more quiz points corresponds to about "
      f"{slope * 10:.1f} more exam points on average,")
print("but individual students still land several points either side of that line.")


# --- How every numerical variable compares ---------------------------
corrs = (df[numerical].drop(columns=["exam_score"])
         .corrwith(df["exam_score"])
         .sort_values())

fig, ax = plt.subplots(figsize=(8, 4.6))

# Emphasis, not a value ramp: the variable under investigation is highlighted,
# the rest recede to a neutral so the comparison reads at a glance.
colors = [BLUE if name == "quiz_average" else MUTED for name in corrs.index]
ax.barh(corrs.index, corrs.values, color=colors,
        edgecolor=SURFACE, linewidth=1.5, height=0.72, zorder=3)

for name, value in corrs.items():
    ax.text(value + 0.012, name, f"{value:+.2f}", va="center",
            fontsize=9.5, color=SECONDARY)

style(ax,
      "Quiz average correlates with exam score far more than any habit does",
      "Pearson correlation with exam_score · missing values excluded per variable",
      "Correlation with exam score (r)",
      "")
ax.grid(False, axis="y")
ax.set_xlim(0, max(corrs.values) * 1.18)

fig.tight_layout()
plt.show()


# =====================================================================
# PART 7 - Does a longer commute cost you attendance?
#
# PREDICTION (written before looking at the result):
#   I expect commute_minutes to be negatively associated with
#   attendance_rate, because a longer trip raises the cost of showing up
#   and gives more chances for something to go wrong on the way.
# =====================================================================

def scatter_relationship(xcol, ycol, title, subtitle, xlabel, ylabel):
    """Generic scatter of any two numerical columns, with a least-squares fit."""
    sub = df[[xcol, ycol]].dropna()
    x, y = sub[xcol], sub[ycol]
    r = x.corr(y)

    fig, ax = plt.subplots(figsize=(8, 5.2))
    ax.scatter(x, y, s=48, color=BLUE, alpha=0.75,
               edgecolors=SURFACE, linewidths=1.2, zorder=3,
               label=f"Student (n = {len(sub)})")

    slope, intercept = np.polyfit(x, y, 1)
    xs = np.array([x.min(), x.max()])
    ax.plot(xs, slope * xs + intercept, color=ORANGE, linewidth=2, zorder=4,
            label=f"Trend: {slope:+.3f} per unit  (r = {r:.2f})")

    style(ax, title, subtitle, xlabel, ylabel)
    leg = ax.legend(frameon=False, loc="lower right", fontsize=9.5)
    for text in leg.get_texts():
        text.set_color(SECONDARY)

    fig.tight_layout()
    plt.show()
    return r


# --- 1. Visualization ------------------------------------------------
r_commute = scatter_relationship(
    "commute_minutes", "attendance_rate",
    "Commute length has no visible effect on attendance",
    "Each dot is one student. The fitted line is essentially flat.",
    "Commute (minutes each way)",
    "Attendance rate (%)",
)

# --- 2. Correlation --------------------------------------------------
header("CORRELATION: commute_minutes vs attendance_rate")
print(f"Pearson r  = {r_commute:+.4f}   (linear relationship)")
print(f"r squared  = {r_commute ** 2:.4f}   "
      f"({r_commute ** 2 * 100:.2f}% of attendance variation accounted for)")

# Commute is right-skewed, so also check the rank correlation, which does not
# assume a straight-line relationship and is not pulled by the long tail.
rho = df["commute_minutes"].corr(df["attendance_rate"], method="spearman")
print(f"Spearman rho = {rho:+.4f}   (rank relationship, robust to the skew)")
print("\nBoth are indistinguishable from zero.")


# --- 3. Grouped check: does the pattern hide inside the average? ------
header("ATTENDANCE BY COMMUTE QUARTILE")

df["commute_quartile"] = pd.qcut(
    df["commute_minutes"], 4,
    labels=["Q1 shortest", "Q2", "Q3", "Q4 longest"],
)

by_commute = df.groupby("commute_quartile", observed=True).agg(
    n_students=("attendance_rate", "count"),
    min_commute=("commute_minutes", "min"),
    max_commute=("commute_minutes", "max"),
    mean_attendance=("attendance_rate", "mean"),
    median_attendance=("attendance_rate", "median"),
    mean_exam=("exam_score", "mean"),
).round(2)
display(by_commute)

fig, ax = plt.subplots(figsize=(8, 4.8))
ax.bar(by_commute.index.astype(str), by_commute["mean_attendance"],
       color=BLUE, edgecolor=SURFACE, linewidth=1.5, width=0.68, zorder=3)

overall = df["attendance_rate"].mean()
ax.axhline(overall, color=ORANGE, linewidth=2, zorder=4,
           label=f"Class average = {overall:.1f}%")

for label, value in by_commute["mean_attendance"].items():
    ax.text(str(label), value + 1.5, f"{value:.1f}%", ha="center",
            fontsize=9.5, color=SECONDARY)

style(ax,
      "Attendance is flat across every commute length",
      "Mean attendance by commute quartile · y-axis starts at 0 so the "
      "differences are not exaggerated",
      "Commute quartile (shortest to longest)",
      "Mean attendance rate (%)")
ax.grid(False, axis="x")
ax.set_ylim(0, 100)          # full scale: a truncated axis would invent a trend

leg = ax.legend(frameon=False, loc="lower right", fontsize=9.5)
for text in leg.get_texts():
    text.set_color(SECONDARY)

fig.tight_layout()
plt.show()


# --- 4. The extreme tail ---------------------------------------------
header("THE LONGEST COMMUTERS")
far = df[df["commute_minutes"] >= 60]
print(f"Students commuting 60+ minutes: n = {len(far)}")
print(f"  their mean attendance: {far['attendance_rate'].mean():.2f}%")
print(f"  class mean attendance: {df['attendance_rate'].mean():.2f}%")
print(f"  standard error on a group this small: "
      f"{df['attendance_rate'].std() / np.sqrt(len(far)):.2f} points")
print("\nThe gap is within the noise you expect from a group of this size,")
print("so it is not evidence of a real effect.")
display(far[["student_id", "commute_minutes", "attendance_rate",
             "study_hours_per_week", "exam_score"]]
        .sort_values("commute_minutes", ascending=False))
