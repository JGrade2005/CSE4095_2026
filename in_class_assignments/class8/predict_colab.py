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
NUMERIC_FEATURES = [
    "study_hours_per_week",
    "sleep_hours_per_night",
    "attendance_rate",
    "practice_problems_per_week",
]
CATEGORICAL_FEATURES = [
    "prior_programming_experience",
    "study_group",
]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


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


# ---------------------------------------------------------------------
# What the preprocessing has to handle (training data only)
# ---------------------------------------------------------------------
header("MISSING VALUES AFTER THE SPLIT")
missing_by_split = pd.DataFrame({
    "train_missing": X_train.isna().sum(),
    "test_missing": X_test.isna().sum(),
})
print(missing_by_split)

# These are the fill values the imputers will learn. They come from
# X_train only, so no test data leaks into training.
header("FILL VALUES LEARNED FROM THE TRAINING SET")
print("Numeric columns, median:")
print(X_train[NUMERIC_FEATURES].median().round(2).to_string())
print("\nCategorical columns, most frequent answer:")
print(X_train[CATEGORICAL_FEATURES].mode().iloc[0].to_string())

header("CATEGORIES SEEN IN TRAINING (one-hot encoding makes one column each)")
for column in CATEGORICAL_FEATURES:
    train_categories = sorted(X_train[column].dropna().unique())
    test_only = set(X_test[column].dropna()) - set(train_categories)
    print(f"{column}: {train_categories}")
    print(f"  categories only in test: {sorted(test_only) or 'none'}")


# =====================================================================
# YOUR TURN: preprocessing + logistic regression pipeline
# Fill in every TODO. The script still runs while they are blank.
# =====================================================================
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ---------------------------------------------------------------------
# Step 1: numeric branch (runs top to bottom on NUMERIC_FEATURES)
#   ("impute", SimpleImputer(strategy=???))
#       Hint: mean or median? Remember the practice_problems outlier (78).
#   ("scale", StandardScaler())
# ---------------------------------------------------------------------
numeric_pipeline = Pipeline(steps=[
    # TODO: add the two (name, transformer) tuples
])

# ---------------------------------------------------------------------
# Step 2: categorical branch (runs top to bottom on CATEGORICAL_FEATURES)
#   ("impute", SimpleImputer(strategy=???))
#       Hint: text has no mean or median. Which strategy works on text?
#   ("encode", OneHotEncoder(handle_unknown=???))
#       Hint: what should happen if the test set has a category train never saw?
# ---------------------------------------------------------------------
categorical_pipeline = Pipeline(steps=[
    # TODO: add the two (name, transformer) tuples
])

# ---------------------------------------------------------------------
# Step 3: send each column list to its branch
#   Each entry is (name, pipeline, list_of_columns).
# ---------------------------------------------------------------------
preprocessor = ColumnTransformer(transformers=[
    # TODO: ("numeric", ..., ...)
    # TODO: ("categorical", ..., ...)
])

# ---------------------------------------------------------------------
# Step 4: full model = preprocessing, then the classifier
#   ("preprocess", preprocessor)
#   ("classifier", LogisticRegression(max_iter=1000, random_state=RANDOM_STATE))
# ---------------------------------------------------------------------
model = Pipeline(steps=[
    # TODO: add the two (name, step) tuples
])

# ---------------------------------------------------------------------
# Step 5: fit on TRAIN only, then check your work
# When Steps 1-4 are filled in, delete the "if" line and un-indent.
# ---------------------------------------------------------------------
if model.steps:
    model.fit(X_train, y_train)

    header("PIPELINE CHECK")
    transformed_train = model.named_steps["preprocess"].transform(X_train)
    print(f"Shape after preprocessing: {transformed_train.shape}  (expected: (200, 9))")
    print(f"Missing values left:       {pd.DataFrame(transformed_train).isna().sum().sum()}  (expected: 0)")
    print("Columns the model sees:")
    print(list(model.named_steps["preprocess"].get_feature_names_out()))

    test_accuracy = model.score(X_test, y_test)
    print(f"\nTest accuracy: {test_accuracy:.1%}  vs baseline {baseline_accuracy:.1%}")
