# =====================================================================
# CSE 4095 - Class 8: Predicting high_exam_score from student habits
# Upload class1_student_habits.csv to the Colab file sidebar, then run.
# Works pasted into one cell, or split at the separators below.
# =====================================================================

import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import train_test_split

# Only blank cells count as missing, so "None" stays a real
# prior_programming_experience answer (same fix as class7).
df = pd.read_csv("class1_student_habits.csv", keep_default_na=False, na_values=[""])

RANDOM_STATE = 42
TARGET = "high_exam_score"
FEATURES = [
    "study_hours_per_week",
    "sleep_hours_per_night",
    "attendance_rate",
    "practice_problems_per_week",
    "prior_programming_experience",
    "study_group",
]


def header(title):
    """Print a labeled divider so each block of output explains itself."""
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


# ---------------------------------------------------------------------
# Create the target
# ---------------------------------------------------------------------
df[TARGET] = (df["exam_score"] >= 80).map({True: "Yes", False: "No"})

# Only the chosen habit columns become X. exam_score, quiz_average,
# student_id, and commute_minutes are left out (see the leakage notes).
X = df[FEATURES]
y = df[TARGET]


# ---------------------------------------------------------------------
# Baseline: how often is the most common class right?
# ---------------------------------------------------------------------
header("MAJORITY-CLASS BASELINE (full dataset)")
class_counts = y.value_counts()
class_shares = y.value_counts(normalize=True)
print(pd.DataFrame({"count": class_counts, "share": class_shares.round(3)}))

majority_class = class_counts.idxmax()
print(f"\nMajority class: {majority_class}")
print(f"Always guessing '{majority_class}' is right {class_shares.max():.1%} of the time.")


# ---------------------------------------------------------------------
# 80/20 train-test split, stratified on the target
# ---------------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=RANDOM_STATE,
    stratify=y,
)

header("TRAIN/TEST SPLIT")
split_summary = pd.DataFrame({
    "rows": [len(y_train), len(y_test)],
    "Yes": [(y_train == "Yes").sum(), (y_test == "Yes").sum()],
    "No": [(y_train == "No").sum(), (y_test == "No").sum()],
    "Yes_share": [(y_train == "Yes").mean().round(3), (y_test == "Yes").mean().round(3)],
}, index=["train", "test"])
print(split_summary)


# ---------------------------------------------------------------------
# Baseline scored the same way a real model will be scored
# ---------------------------------------------------------------------
# DummyClassifier ignores the features. "most_frequent" learns the
# majority class from the training set and always predicts it.
baseline_model = DummyClassifier(strategy="most_frequent")
baseline_model.fit(X_train, y_train)
baseline_accuracy = baseline_model.score(X_test, y_test)

header("BASELINE ACCURACY ON THE TEST SET")
print(f"Baseline always predicts: {baseline_model.predict(X_test)[0]}")
print(f"Baseline test accuracy:   {baseline_accuracy:.1%}")
print("Any classifier must beat this number to be learning something useful.")
