# Class 11 Answer Guide

Draft answers for every question, grounded in the executed notebook's real numbers. Every entry is a DRAFT: rewrite it in your own words before putting it in the notebook.

## Part 1 — Load and Understand the Dataset

### Q: What does one row represent?
*DRAFT — rewrite in your own words*
- **Draft answer:** One row is one car (one vehicle entry) described by its fuel economy and five engineering and build measurements plus the model year. The table has 398 rows, so 398 cars, and 7 columns. This version of the dataset has no car name column, so a row has no label beyond its numbers.
- **Evidence:** Part 1, cell 4 (load and shape): Shape (398, 7), columns mpg, cylinders, displacement, horsepower, weight, acceleration, model_year. Part 1, cell 5 (first 10 rows): row 0 is mpg 18.0, 8 cylinders, displacement 307.0, horsepower 130.0, weight 3504, acceleration 12.0, model_year 70. Part 1, cell 6 (dtypes): all seven columns are numeric and there is no text column.
- **Key concept:** In tabular data a row is one observation (one sample) and the columns are its variables.
- **Watch out:** Do not call a row a car "brand" or "model name" (there is no name column), and do not assume it is one row per model year.

### Q: What is the prediction target?
*DRAFT — rewrite in your own words*
- **Draft answer:** The target is `mpg`, a car's fuel economy in miles per gallon, which is what the assignment asks us to predict. Everything else in the table is a candidate input. The mpg values run from 9.0 to 46.6 with a mean of about 23.5 and a median of 23.0.
- **Evidence:** Part 1, cell 8 (describe): mpg count 398, mean 23.514573, min 9.0, median (50%) 23.0, max 46.6. Part 1, cell 9 (mpg histogram): mean line at 23.5, median dashed line at 23.0, bars spread across roughly 9 to 47 with the tallest bars near 14 and 17 and a thinner tail toward the high end.
- **Key concept:** The target (y) is the column we want to predict, and the features (X) are the columns we use to predict it.
- **Watch out:** `mpg` must never be included in the feature matrix X, or the model would be given the answer.

### Q: Why is this a regression problem?
*DRAFT — rewrite in your own words*
- **Draft answer:** The target `mpg` is a continuous number stored as a decimal (float64), not a small set of classes. Its values cover a wide range and include fractions such as 46.6, so we want to predict a quantity and measure how far off we are, for example with MAE. A classification problem would instead predict a label such as "high mpg" or "low mpg".
- **Evidence:** Part 1, cell 6 (dtypes): mpg is float64. Part 1, cell 8 (describe): mpg min 9.0, max 46.6, std 7.815984. Part 1, cell 9 (mpg histogram): values are spread over a wide range with no separate groups of classes.
- **Key concept:** Regression predicts a continuous numeric value, while classification predicts a category.
- **Watch out:** A numeric target is not automatically regression, so check whether the number is a quantity (mpg) or a code for a class.

### Q: Which columns could potentially be useful predictors?
*DRAFT — rewrite in your own words*
- **Draft answer:** All six other columns are candidates, but the scatter plots show they differ in how they relate to mpg. `weight` shows a fairly straight downward trend. `displacement` and `horsepower` fall steeply at low values and then flatten, so those look curved (nonlinear). `model_year` trends upward with a lot of spread at each year, `cylinders` has only a few discrete values (3, 4, 5, 6, 8), with mpg highest at 4 and lowest at 8 (the few 3-cylinder cars sit below the 4-cylinder ones, so the trend is not perfectly steady), and `acceleration` looks weak and scattered with at most a faint upward drift.
- **Evidence:** Part 1, cell 10 (scatter grid of mpg vs each feature): weight, downward and roughly linear; displacement and horsepower, downward and curved; model_year, upward with wide vertical spread at each year from 70 to 82; cylinders, vertical stripes at 3, 4, 5, 6 and 8 with none at 7, and the 8-cylinder stripe sits lowest; acceleration, diffuse cloud with a weak relationship. No correlation coefficients were computed in the notebook (Not in notebook output).
- **Key concept:** Scatter plots against the target show whether a relationship is linear, curved or weak, which guides model choice and feature engineering.
- **Watch out:** Visual impressions are not measured strengths, and displacement, horsepower and weight overlap with each other, so do not assume each adds independent information.

### Q: Which columns contain missing values?
*DRAFT — rewrite in your own words*
- **Draft answer:** Only `horsepower` has missing values, with 2 missing entries, and all other columns are complete. That is a very small share of the table: horsepower has a count of 396 against 398 rows for every other column. The plan is to fill these gaps with an imputer inside a Pipeline later, so the filling is learned only from training data and CV does not leak.
- **Evidence:** Part 1, cell 7 (isna sum): horsepower 2, every other column 0. Part 1, cell 8 (describe): horsepower count 396 versus 398 for all other columns.
- **Key concept:** Missing values are handled by imputation, and the imputer should be fit only on training data (inside a Pipeline).
- **Watch out:** Do not fill missing values on the full dataset before splitting, and do not drop rows without checking how many are affected.
