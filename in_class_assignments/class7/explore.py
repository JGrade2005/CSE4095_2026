"""Basic profile of a dataset: shape, column names, dtypes, missing values."""

import sys
import pandas as pd

# This dataset uses the literal string "None" as a real category in
# prior_programming_experience (None / Some / Strong).  pandas treats "None" as
# a missing value by default, which would silently delete 88 valid answers, so
# turn the default list off and count only truly blank cells as missing.
NA_VALUES = [""]


def explore(path):
    df = pd.read_csv(path, keep_default_na=False, na_values=NA_VALUES)

    print(f"Number of rows:    {df.shape[0]}")
    print(f"Number of columns: {df.shape[1]}")

    print("\nColumn names:")
    for name in df.columns:
        print(f"  {name}")

    print("\nData type and missing values per column:")
    summary = pd.DataFrame({
        "dtype": df.dtypes,
        "missing": df.isna().sum(),
        "missing_pct": (df.isna().mean() * 100).round(2),
    })
    print(summary.to_string())

    print(f"\nTotal missing values: {df.isna().sum().sum()}")
    return df


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "class1_student_habits.csv"
    explore(path)
