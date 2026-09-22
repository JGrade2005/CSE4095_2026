# ============================================================
# Cell 1 - upload the CSV
# ============================================================
from google.colab import files

uploaded = files.upload()          # pick class1_student_habits.csv
CSV = "class1_student_habits.csv"

# ============================================================
# Cell 2 - load it
# ============================================================
import pandas as pd

# "None" is a real category in prior_programming_experience (None/Some/Strong).
# pandas treats the string "None" as missing by default, which would silently
# delete 88 valid answers, so only blank cells count as missing here.
df = pd.read_csv(CSV, keep_default_na=False, na_values=[""])

df.head()

# ============================================================
# Cell 3 - rows and columns
# ============================================================
print(f"Number of rows:    {df.shape[0]}")
print(f"Number of columns: {df.shape[1]}")

# ============================================================
# Cell 4 - column names
# ============================================================
list(df.columns)

# ============================================================
# Cell 5 - dtypes and missing values
# ============================================================
summary = pd.DataFrame({
    "dtype": df.dtypes,
    "missing": df.isna().sum(),
    "missing_pct": (df.isna().mean() * 100).round(2),
})
summary.index.name = "column"
summary

# ============================================================
# Cell 6 - total
# ============================================================
print(f"Total missing values: {df.isna().sum().sum()}")
