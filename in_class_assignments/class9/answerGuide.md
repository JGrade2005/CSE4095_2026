# Answer Guide: Class 9, Regression and Model Error

Key ideas and evidence for every question in `CSE4095_Class3_Starter.ipynb`.

**How to use this:** these are talking points, not finished answers. Write each answer in your own words. Numbers come from the notebook's outputs, so point to them as evidence.

---

## Part 1: Regression vs. Classification

**1. Why is this a regression problem?**
- The target, `exam_score`, is a **continuous number** (51.4 to 100 in this data, with decimals like 76.95). The model has to predict a quantity, not pick a category.
- A prediction can be close or far off, not simply right or wrong. Predicting 82 for a student who scored 84 is a small miss, predicting 60 is a big one. Regression metrics (MAE, RMSE, R²) measure *how far off* the predictions are.
- Rule of thumb: the type of the target decides the problem type. Number = regression, label = classification.

**2. How is this different from the Class 2 classification problem?**
- Same students, same habit features. Only the target changes.
- Classification target: `high_exam_score`, "Yes" if `exam_score` >= 80, else "No" (99 Yes, 151 No). The model outputs a class (and optionally a probability).
- Regression target: `exam_score` itself. The model outputs a number on the score scale.
- Different metrics follow from that: accuracy, precision, recall, confusion matrix for classification versus MAE, RMSE, R² and residuals for regression.
- Different baseline: classification compares against "always predict the majority class" (60.4%). Regression compares against "always predict the training mean".

**3. What information is lost when we convert exam_score into only Yes or No?**
- **How far above or below 80** a student is. A 79.9 and a 51.4 both become "No". An 80.0 and a 100 both become "Yes".
- **Near-threshold students look maximally different.** 79.9 ("No") and 80.0 ("Yes") are basically the same performance but get opposite labels.
- **Ordering within each group.** You can no longer rank students, spot the very lowest scorers who need the most help, or say how much a habit changes the score (for example, about 1.8 points per extra study hour in Part 3).
- **Error size.** A classifier's mistake is just "wrong". A regression residual says by how many points.
- The 80 cutoff is a choice. Change it and the labels change, while the actual scores don't.

**4. What kind of output should a regression model produce?**
- A **number on the same scale as the target**: a predicted exam score for each student, for example 78.4.
- One prediction per student, compared with the actual score through the residual (actual minus predicted).
- Predictions can include decimals, and a linear model can even go slightly outside the real range (below 51.4 or above 100), because it doesn't know scores are capped at 100. Worth keeping in mind when you look at the largest errors later.

---

## Part 2: Understand the Target

**Evidence from the notebook:** count 250, mean 77.16, median 76.95, std 10.33, min 51.4, max 100. Q1 69.50, Q3 84.97, IQR 15.47. Fences 46.29 and 108.19. Zero scores outside the fences.

**1. Describe the distribution of exam scores.**
- **Center:** mean 77.2 and median 77.0, almost identical. That points to a **roughly symmetric** distribution (skew is about 0.04, basically zero).
- **Spread:** std 10.3 points, so a typical student is about 10 points from the average. About 65% of students are within one std (67 to 87). The middle half (IQR) spans 69.5 to 85.0.
- **Shape:** one main hump around 70 to 82, tapering off on both sides. Roughly bell-shaped, a bit bumpy (normal with 250 students and 20 bins).
- **Range:** 51.4 to 100. Only 12 students scored below 60 and 27 scored 90 or above.
- **Ceiling:** the max is exactly 100 and 3 students hit it. Scores can't go above 100, so the right tail is cut off.

**2. Are there unusually low or high values?**
- By the 1.5 IQR rule, **no**. The lowest score (51.4) is well above the lower fence (46.3), and 100 is far below the upper fence (108.2). Both counts printed 0.
- The lowest scores (around 51 to 56) are in the tail but still plausible. Nothing looks like a data-entry error (no negatives, nothing above 100).
- The three perfect 100s aren't statistical outliers, but they are worth noting: the true performance of those students could be higher than 100 suggests (ceiling effect).
- Even if outliers had appeared, the instruction was to report them, not remove them. Removing real students just because they're unusual would make the model look better than it really is.

**3. Why is it useful to understand the target before trying to predict it?**
- **It sets expectations for error.** The std (10.3) is roughly what you'd get by always guessing the mean. A useful model must beat that. An MAE of 8 points means something very different from an MAE of 2.
- **It sets up the baseline.** The mean (about 77) is the baseline prediction in a later Part.
- **It shows the valid range.** Scores live between about 50 and 100, so a prediction of 110 or 30 is clearly wrong.
- **It catches data problems early:** missing values (none here), impossible values, outliers, ceiling effects.
- **It informs modeling choices.** A symmetric target with no extreme outliers is a good fit for plain linear regression and squared-error metrics. A heavily skewed target with outliers would need more care (RMSE would be dominated by a few students).

---

## Part 3: Explore One Relationship

**Evidence from the notebook:** Pearson r = 0.516 with 241 students (9 dropped for missing study hours). Trend line slope is about 1.84 points per extra weekly study hour, starting at about 63.4 for zero hours.

**1. Does there appear to be a relationship?**
- **Yes, a moderate one.** r = 0.52 is clearly above zero but far from 1. The cloud of points drifts upward from left to right.
- There's a lot of scatter around the line. Students who study the same amount can differ by 30+ points.
- Extra detail: r² is about 0.27, so study hours alone account for roughly a quarter of the variation in scores. The other three quarters come from other factors (or noise). That's why the model uses several features.

**2. Is the relationship positive or negative?**
- **Positive.** Students who study more tend to score higher. Both r (+0.52) and the trend line's slope (+1.84 points per hour) are positive.
- Average score by study hours makes it concrete: 0 to 3 hours averages about 66, 7 to 9 hours about 78, 9 to 11 hours about 83.

**3. Does it appear approximately linear?**
- **Roughly linear over most of the range**, about 3 to 11 hours, where the averages climb steadily (70.5, 74.5, 78.4, 83.3).
- **Possible flattening at the high end:** above 11 hours the averages barely rise (83.8, 85.6). That's only 28 students, so it's a hint, not a firm conclusion. A straight line may slightly over-predict for very heavy studiers. Scores also can't pass 100, which naturally bends the top.
- No clear curve shape (like a U) in the scatter, so a straight line is a reasonable first model. Pearson r only measures *linear* association, so the "is it linear" check matters.

**4. Are there students who do not follow the general pattern?**
- **Yes.** 17 students are more than 15 points away from the trend line. The biggest ones:

| Student | Study hrs | Score | vs. trend line | Notes |
|---|---|---|---|---|
| S174 | 17.8 | 64.8 | 31 below | Most hours in the dataset, 0 practice problems |
| S073 | 6.7 | 51.4 | 24 below | Lowest score overall |
| S167 | 7.0 | 56.9 | 19 below | No prior experience |
| S232 | 5.1 | 96.5 | 24 above | Strong prior experience |
| S140 | 7.3 | 96.6 | 20 above | Strong experience, 100% attendance |
| S216 | 9.0 | 99.0 | 19 above | Strong experience, 100% attendance |

- On the plot: the point far right near (17.8, 65) and the high scorers around 5 to 7 hours near the top.
- Possible explanations: other factors matter (the high scorers above the line all have strong prior experience), study *quality* differs from study *quantity*, or the data is noisy. These students will likely be among the model's largest errors later.

**About the reminder (correlation is not causation):** the plot shows study hours and scores move together. It doesn't prove studying *causes* the higher score. A third factor, like motivation or prior experience, could drive both.

---

## Part 4: Preprocessing Pipeline

**Note:** Part 4's questions mention cross-validation and Random Forests, but this notebook uses neither (one train/test split, LinearRegression and DecisionTreeRegressor). Answer them as general concepts.

**What the preprocessor does:** 5 numeric features go through median imputation then StandardScaler. 2 categorical features go through most-frequent imputation then one-hot encoding (prior experience: None / Some / Strong = 3 columns, study group: No / Yes = 2 columns). Result: 10 model columns. Missing values it has to fill: study hours 9, sleep 12, prior experience 7.

**1. Why should preprocessing be included inside the pipeline?**
- **Learned only from training data.** The imputer's medians, the scaler's mean and std, and the encoder's categories are all *learned*. Inside a pipeline, `fit` learns them from the training rows only and `predict` just applies them. The test set never influences them, so the test score stays honest.
- **Same steps every time.** Training data, test data and any new student go through identical transformations automatically. You can't forget a step or apply it in the wrong order.
- **One object to fit and evaluate.** `make_pipeline_for(model)` wraps the same preprocessing around every model, which keeps comparisons fair. `clone()` gives each model its own unfitted copy, so fitting the tree doesn't overwrite what the linear regression learned.

**2. Why is this especially important when using cross-validation?**
- In CV, each fold takes a turn as the "unseen" validation data. If you impute and scale the whole dataset *before* CV, the medians and means were computed using the validation fold too. That's a small leak, and the CV score comes out slightly too optimistic.
- With the pipeline passed into cross-validation, preprocessing is **re-fitted inside every fold** on that fold's training part only. Each validation fold is treated exactly like a real test set.
- The same logic applies here even without CV: the pipeline is fitted on the training split only, so the test set acts as truly new data.

**3. Which of the models in this assignment are sensitive to feature scaling?**
- **Mean baseline: no.** It ignores the features.
- **LinearRegression (plain, no regularization): predictions are not affected.** Scaling a feature just rescales its coefficient (for example, coefficient per hour vs. per standard deviation), and the predictions, MAE, RMSE and R² come out the same. What *does* change is the coefficients: after scaling, each one means "points per one standard deviation", so you can compare their sizes fairly. Without scaling, commute (0 to 145 minutes) and sleep (about 4 to 10 hours) are on different scales, so raw coefficient sizes are misleading.
- **Regularized linear models (Ridge, Lasso) and distance-based models (kNN, SVM): yes**, strongly. Not in this assignment, but they're the classic examples, because they penalize coefficient sizes or measure distances.
- **DecisionTreeRegressor: no** (see Q4).

**4. Do Decision Trees and Random Forests generally require scaling?**
- **No.** A tree splits one feature at a time with a threshold, like "study_hours_per_week <= 8.2". Scaling changes the threshold number but not *which students land on each side*, so the splits and predictions stay the same.
- A Random Forest is many trees averaged, so the same reasoning applies.
- Trees never compare features to each other or compute distances, so units don't matter.
- The scaler can stay in the shared preprocessor anyway. It doesn't hurt trees and keeps preprocessing identical for every model.
- Caveat: scikit-learn trees still need missing values filled and text categories turned into numbers, so the imputers and one-hot encoder are still needed.
