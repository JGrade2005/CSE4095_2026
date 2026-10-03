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

## Part 4: Choose the Base Features

No questions were given for this Part. Context that may help with later questions:

- **Numerical (5), detected by dtype:** `study_hours_per_week`, `sleep_hours_per_night`, `attendance_rate`, `practice_problems_per_week`, `commute_minutes` (`float64` or `int64`).
- **Categorical (2):** `prior_programming_experience` (None / Some / Strong) and `study_group` (Yes / No), dtype `str`.
- **Missing values to handle later:** study hours 9, sleep 12, prior experience 7.
- **Why the excluded columns are out:**
  - `exam_score` is the target. Using it as a feature would hand the model the answer.
  - `student_id` is an arbitrary label, unique per student. It carries no information about habits, and a model could only memorize individuals with it.
  - `quiz_average` is measured during the course and tracks the same skill as the exam (r = 0.77 with `exam_score`, much stronger than any habit). It may not be known when you'd want to make the prediction, so it's tested separately in Part 14.
- `prior_programming_experience` has a natural order (None < Some < Strong), so it's *ordinal*, but it's still treated as categorical here.

---

## Part 5: Training and Test Sets

**Evidence from the notebook:** 0 rows dropped (no missing exam_score). Train 200 students, test 50. Mean exam_score is 77.73 in train and 74.89 in test.

**1. What is the training set used for?**
- **Learning.** The model looks at these 200 students' features *and* their actual scores and finds the pattern that links them (for linear regression, the coefficients).
- Everything learned in the pipeline comes from here: the imputer's medians, the scaler's means and stds, the encoder's categories, and the model itself.

**2. What is the test set used for?**
- **One final, honest check.** These 50 students stand in for future students the model has never seen. You predict their scores and compare against the real ones to estimate real-world error (MAE, RMSE, R²).
- Their actual scores are used *only* to grade the predictions, never to fit anything.

**3. Why should the model not be trained using the test set?**
- Then it's no longer unseen data. The model has already "seen the answers", so its test score would be too optimistic and wouldn't tell you how it does on genuinely new students.
- Analogy: grading a student on the exact questions they practised with. A high grade proves memorization, not understanding.
- The same goes for indirect use: tweaking the model after looking at test results also leaks test information into your choices (rule 2 in this project).

**4. Why should different experiments use the same split when comparing them fairly?**
- **Different splits = different test students.** Some splits happen to have easier or harder students. If model A is scored on one split and model B on another, a difference in score might just be luck of the split, not a better model.
- **Concrete evidence here:** this test set's mean (74.89) is almost 3 points below the training mean (77.73). Another `random_state` would give a different gap. Every model in this notebook faces the same 50 students, so any difference in error comes from the model, not the data.
- That's why `quiz_average` was included in the split itself: Part 14 can add it without re-splitting, so the comparison is apples to apples.
- Like a controlled experiment: change one thing (the model or the features) and keep everything else fixed.

---

## Part 6: Preprocessing

**Evidence:** the training set has missing study hours (6), sleep (9) and prior experience (7). After preprocessing, the 7 features become 10 columns: 5 scaled numbers + 3 for prior experience (None / Some / Strong) + 2 for study group (No / Yes).

**1. Why do we handle numerical and categorical variables differently?**
- **Models only understand numbers.** Numeric columns are already numbers. Categorical columns are text ("Some", "Yes") and have to be converted.
- **Filling missing values:** the median makes sense for numbers (a typical value, not pulled by extremes). Text has no median, so categories use the most frequent value instead.
- **Scaling:** only makes sense for numbers. Categories become 0/1 columns, which are already on a simple scale.
- `ColumnTransformer` lets each group get its own steps, then glues the results back together.

**2. What does StandardScaler do?**
- For each numeric column, it subtracts the column's mean and divides by its standard deviation: `(value - mean) / std`.
- Afterwards each column has mean 0 and std 1. A value of +1 means "one standard deviation above average".
- Example: training study hours have mean about 7.7 and std about 2.9. A student with 10.6 hours becomes about +1.0. A student with 4.8 hours becomes about -1.0.
- Why: features measured in very different units (commute 0 to 145 minutes vs. sleep about 4 to 10 hours) end up on the same scale, so their coefficients can be compared fairly.

**3. What does one-hot encoding do?**
- Turns one categorical column into one 0/1 column per category.
- Example: `prior_programming_experience` becomes three columns. A student with "Some" gets None = 0, Some = 1, Strong = 0.
- Why not just number them 0, 1, 2? That invents distances (it would say "Strong" is exactly twice "Some"). For something like study group, an order wouldn't mean anything at all.
- `handle_unknown="ignore"`: if a new category shows up at prediction time that wasn't in training, it gets all zeros instead of crashing.

**4. Why should preprocessing be learned from the training data rather than the entire dataset?**
- The medians, means, stds and categories are *learned* values. If they're computed on all 250 students, the test students have influenced them. That's a small leak: the test set is no longer fully unseen.
- Real life works this way too: when a new student arrives, you only have past students to compute medians and means from. Fitting on training data only simulates that.
- Concrete example: the median study hours is 7.6 in the training set but 7.5 across all 250 students. Small difference, but the principle is what matters, and with other techniques the leak can be big.
- The pipeline handles this automatically: `fit` on training data learns them, `predict` on test data only applies them.

---

## Part 7: Mean Baseline

**Evidence:** every test student is predicted 77.73 (the training mean). MAE 7.659, MSE 96.08, RMSE 9.802, R² -0.091.

**1. Why is this baseline useful?**
- **It's the "no learning" reference point.** It uses no features at all, only the average score. A real model has to beat it to show the features carry useful information.
- **It gives meaning to the numbers.** On its own, "MAE = 6" is hard to judge. Compared with the baseline's 7.66 it becomes "about 1.7 points better than just guessing the average".
- **It catches broken models.** If a model doesn't beat the baseline, something is wrong (bad features, a bug, or no real pattern).
- **About the negative R²:** R² compares a model with predicting the *test set's own* mean (74.89). The baseline predicts the *training* mean (77.73), which is about 3 points too high for these test students, so it does slightly worse than that and R² dips below 0. R² of 0 means "as good as guessing the right average", and below 0 means worse than that. It's another sign that this particular test set has somewhat lower scores.

---

## Part 8: Linear Regression

**Evidence:** the first 10 test students' differences (actual minus predicted) range from -7.6 to +3.6. Negative = the model predicted too high, positive = too low.

**1. What does .fit() do?**
- **Learns from the training data.** For this pipeline it runs every step in order on `X_train` and `y_train`:
  - The imputers learn the medians and most frequent categories, then fill the gaps.
  - The scaler learns each column's mean and std.
  - The encoder learns which categories exist.
  - `LinearRegression` finds the intercept and one coefficient per column that make predictions as close as possible to the actual scores (it minimizes the squared errors).
- After `fit`, all those learned values are stored inside `lin_reg`.

**2. What does .predict() do?**
- **Applies what was learned to new data,** without learning anything new. Test data goes through the same imputing, scaling and encoding using the *training* statistics, then the model computes intercept + sum of (coefficient x feature value) for each student.
- Output: one predicted score per student (50 predictions here).
- It never sees `y_test`. The actual scores are only used afterwards to measure the error.

**3. Why can predictions contain decimals when original scores are whole numbers?**
- **Check the premise first:** in this dataset most scores are *not* whole numbers. Only 27 of the 250 are (for example 68.0, 84.0). The rest have decimals, like 72.5 and 78.3. Worth saying so in your answer.
- The general point still holds: a linear model's prediction is intercept + coefficients x feature values. The coefficients are decimals and the scaled features are decimals, so the result is almost never a round number.
- The model predicts a point on a continuous scale. It has no rule that scores must be whole numbers (or stay under 100).
- Decimals aren't a problem. You can round predictions for display, but the metrics use the exact values.

---

## Part 9: Evaluate Prediction Error

**Evidence from the notebook:**

| Model | MAE | MSE | RMSE | R² |
|---|---|---|---|---|
| Mean baseline | 7.659 | 96.080 | 9.802 | -0.091 |
| Linear Regression | 5.774 | 69.698 | 8.349 | 0.209 |

**1. Which metric is easiest to explain in exam-score points?**
- **MAE.** "On average, the prediction is off by about 5.8 points." It's in points, and it's a plain average of how far off each prediction is.
- RMSE is also in points, but it's a square root of an average of squares, which is harder to say in one sentence.

**2. Why does MSE penalize large errors more than MAE?**
- MSE **squares** each error before averaging. Squaring grows fast: an error of 2 counts as 4, an error of 10 counts as 100, an error of 37 counts as about 1,390.
- MAE counts every point of error the same: 10 points off is exactly 5 times worse than 2 points off. In MSE it's 25 times worse.
- **Evidence from this test set:** one student (row 173) was predicted 102.1 but scored 64.8, an error of 37.3. That one student is about **13% of the total absolute error** but about **40% of the total squared error**. Without that student, RMSE would drop from 8.35 to about 6.54, while MAE would only drop from 5.77 to about 5.13.

**3. Why might RMSE be easier to interpret than MSE?**
- MSE is in **squared points** (69.7 points²), which doesn't mean anything intuitive. Nobody thinks in "squared exam points".
- RMSE takes the square root, so it's back in **points** (8.35), on the same scale as the scores and comparable with MAE.
- It keeps MSE's extra weight on big errors, so it's a good partner to MAE: if RMSE is much bigger than MAE, a few large errors are present (here 8.35 vs 5.77, consistent with row 173).

**4. Did Linear Regression outperform the baseline?**
- **Yes, on every metric** on this test set: MAE 5.77 vs 7.66 (about 1.9 points better on average), RMSE 8.35 vs 9.80, R² 0.209 vs -0.091.
- So the habit features carry real information beyond just "guess the average".

**5. What does your R² tell you?**
- R² = 0.209: the model explains about **21% of the variation** in test scores. It's better than predicting the test set's mean, but most of the variation (about 79%) is still unexplained.
- In plain words: habits help, but they leave a lot out (ability, test-day factors, things not in the data). Matches Part 3, where study hours alone had r² of about 0.27 on the full data.
- One big miss (row 173) drags R² down too, since R² is built from squared errors.
- The baseline's negative R² is explained in Part 7.

---

## Part 10: Actual vs Predicted

**Evidence:** test predictions range from 60.7 to 102.1, actual scores from 57.2 to 100. 29 of 50 students are within 5 points, 42 within 10.

**1. What would a perfect model look like?**
- Every point exactly **on the dashed diagonal**: predicted = actual for every student. All residuals 0, MAE and RMSE 0, R² = 1.

**2. Are most points close to the diagonal?**
- **Most are reasonably close, with clear scatter.** The cloud follows the diagonal's direction (higher actual scores tend to get higher predictions), and 29 of 50 students are within 5 points.
- But the points form a wide band rather than a tight line, consistent with R² of about 0.21.
- One point is far off: actual about 65, predicted about 102 (top left).

**3. Where does the model make larger errors?**
- **At the extremes.** The model's predictions are squeezed toward the middle:
  - **High scorers get under-predicted.** The 8 students who scored 85+ are under-predicted by about 6.9 points on average (points below the diagonal on the right). The student who scored 100 was predicted 82.2.
  - **Low scorers get over-predicted.** The 9 students below 65 are over-predicted by about 9.5 points on average (points above the diagonal on the left).
- This "shrinking toward the mean" is typical when features only explain part of the variation.
- Plus the single big miss at the top left, the only prediction above 100 (impossible as a real score).

---

## Part 11: Residuals

**Evidence:** residuals range from -37.3 to +17.8. Average residual -0.64 (close to 0). 28 students over-predicted, 22 under-predicted.

**1. What does a positive residual mean?**
- Actual > predicted. The student **scored higher than the model expected** (the model under-predicted). Example: row 108 scored 100, predicted 82.2, residual +17.8.

**2. What does a negative residual mean?**
- Actual < predicted. The student **scored lower than expected** (the model over-predicted). Example: row 173 scored 64.8, predicted 102.1, residual -37.3.

**3. What does a residual near zero mean?**
- The prediction was **almost exactly right** for that student. Example from Part 8: row 6, actual 68.0, predicted 68.4, residual -0.4.

**4. Do you see any pattern?**
- **Left plot:** most points are scattered in a band about ±10 around zero with no strong curve or funnel shape. That's what you hope for: no obvious structure the model has missed.
- **One clear outlier** at the bottom right (predicted about 102, residual -37). It's the only prediction above 100.
- **Histogram:** centered near 0 (mean -0.64), roughly bell-shaped from about -11 to +18, plus the single far-left bar at about -37.
- Subtle point if you want it: residuals tend to be positive for high actual scores and negative for low ones (the shrinking from Part 10). That shows up more clearly when plotted against *actual* scores than against predicted ones.
- With only 50 points, be careful calling weak patterns real.

---

## Part 12: Largest Errors

No numbered questions. Fill in the two case templates. Candidate rows and what the data show (the hypotheses are yours to write, these are only prompts):

**Row 173 (biggest error):** actual 64.8, predicted 102.1, residual -37.3.
- What the data show: 17.8 study hours (the most in the whole dataset), 0 practice problems, 98.1% attendance, strong prior experience, in a study group.
- Things to think about: the model adds about 2.1 points per study hour with no limit, and 17.8 is far beyond most training students (Part 3 showed scores flattening above 11 hours). Strong experience adds more. Is the number of hours plausible, or could it be a data error? Does study time without practice translate into exam performance? Note this student was also the furthest from the trend line in Part 3.

**Row 108:** actual 100.0, predicted 82.2, residual +17.8.
- What the data show: 10.1 study hours, 25 practice problems, 91.6% attendance, **no** prior experience, 0 commute.
- Things to think about: the model subtracts points for "None" experience, but this student hit a perfect score anyway. What might the data not capture (aptitude, quality of study)?

**Row 19:** actual 92.2, predicted 76.9, residual +15.3. Sleep is missing (filled with the median), which is worth noticing.

**Row 69:** actual 75.5, predicted 60.7, residual +14.8. Low attendance (64.3%) and few study hours (4.6), but scored near average.

**Extra evidence for the two strongest cases (not shown in the notebook):**
- Row 173 (S174): 17.8 hours is more than any training student (training max 16.2). Only 11 training students study over 12 hours, and they average 83.5. The 10 training students with 0 practice problems average 72.2 (overall 77.7). Quiz average 78.3, middle of the class (53rd percentile).
- Row 108 (S109): quiz average 94.1 (93rd percentile). Only 1 of the 70 training students with no prior experience scored 95+. 25 practice problems is above the median (16).

**Feature means (top 10 errors vs. whole test set):** study hours 7.97 vs 6.74 (pulled up by row 173), practice problems 11.5 vs 15.6, sleep 6.71 vs 7.16. Attendance and commute are almost the same. Only 10 students, so treat this as a description, not a finding.

**For the reminder:** a hypothesis about one student is a guess at a reason. Single cases can't prove cause, and the data don't record things like motivation or test-day conditions.

---

## Part 13: Coefficients

**Evidence:** intercept 78.562.

| Feature | Coefficient |
|---|---|
| study_hours_per_week | +5.933 |
| prior_programming_experience_Strong | +5.060 |
| practice_problems_per_week | +3.169 |
| attendance_rate | +1.976 |
| sleep_hours_per_night | +1.329 |
| commute_minutes | +0.528 |
| study_group_No | +0.120 |
| study_group_Yes | -0.120 |
| prior_programming_experience_Some | -0.192 |
| prior_programming_experience_None | -4.867 |

**1. Which features have positive coefficients?**
- All five numeric features: study hours, practice problems, attendance, sleep, commute.
- Categories: prior experience = Strong, and study group = No (barely, +0.12).

**2. Which features have negative coefficients?**
- Prior experience = None (-4.87) and Some (-0.19), and study group = Yes (-0.12).
- **Careful with one-hot features:** the categories of one feature only make sense compared with each other. The encoder keeps all categories, so each feature's coefficients are centered around zero. "Some is negative" doesn't mean Some hurts. It means Some is predicted slightly lower than the average across categories. The meaningful number is the difference: **Strong vs None = 5.06 - (-4.87) = about 9.9 points**, all else equal.
- Study group Yes vs No is a difference of only 0.24 points, basically nothing.
- Commute being positive (+0.53) is a bit surprising, but it's small and probably noise.

**3. Which features have relatively large magnitudes?**
- **Study hours (+5.9 per std)** is the largest numeric coefficient. One std is about 2.8 hours, so about 2.1 points per extra hour.
- **Prior experience** has the biggest spread between categories (about 9.9 points from None to Strong).
- **Practice problems (+3.2 per std)** comes next.
- Small: sleep, commute, study group.
- Remember the note: numeric coefficients are per 1 std, one-hot ones compare categories, so the comparison across the two types is rough.

**4. What does a positive coefficient mean in this fitted model?**
- Holding all other features fixed, a higher value of that feature goes with a **higher predicted** exam score.
- For a scaled numeric feature: +1 std in study hours (about 2.8 hours) raises the prediction by about 5.9 points.
- For a one-hot category: being in that category raises the prediction compared with the other categories of the same feature.
- It describes the *model's* predictions, not what happens to a real student (see the causation reminder).

**About the reminder:** coefficients show association in this data, adjusted for the other features in the model. They don't prove that changing a habit would change a score. Things not in the data (motivation, ability) can be behind both.

---

## Part 14: Add quiz_average

**Evidence from the notebook:**

| Model | MAE | RMSE | R² |
|---|---|---|---|
| Mean baseline | 7.659 | 9.802 | -0.091 |
| Linear Regression | 5.774 | 8.349 | 0.209 |
| Linear Regression + quiz_average | 4.749 | 6.231 | 0.559 |

**1. Did MAE improve?**
- **Yes.** 5.774 to 4.749, about 1.0 point smaller average error (about 18% better).

**2. Did RMSE improve?**
- **Yes, even more.** 8.349 to 6.231 (about 25% better). RMSE dropping more than MAE means the biggest errors shrank the most. Row 173 went from predicted 102.1 to 87.9, and the largest error overall fell from 37.3 to 23.1.

**3. Did R² improve?**
- **Yes, a lot.** 0.209 to 0.559. The model now explains about 56% of the variation instead of 21%.

**4. Was the hypothesis supported?**
- **Yes, on all three metrics,** in the direction predicted (MAE and RMSE down, R² up).
- Supporting reason: quiz_average has r = 0.77 with exam_score in the training set, much stronger than any habit (study hours about 0.5). It gets the biggest coefficient in the new model (+5.44 per std), and study hours drops from +5.9 to +2.6, because quiz scores already capture part of what study hours were telling the model.
- Caveats: one split, 50 test students. "Supported" is the right word, not "proven".

**5. Would quiz_average be available when the prediction is made?**
- **Depends on when you predict.**
  - **After quizzes (mid-semester or just before the final):** yes, it's known. Then it's a legitimate and very useful feature, for example to flag students at risk before the final.
  - **Before any quizzes (start of semester):** no. The quiz average doesn't exist yet. A model that needs it can't be used, and its impressive test score would be misleading for that purpose.
- That's why it's left out of the base model: the base model answers "can habits alone predict the score?", which works from day one.
- Related idea: quiz_average is close to the target. It measures the same skill as the exam, so it is borderline leakage depending on the use case. Not leakage if you really predict after quizzes, a problem if the deployment is "before the course starts".

---

## Part 15: Random Forest

**Evidence from the notebook:**

| Model | MAE | RMSE | R² |
|---|---|---|---|
| Mean baseline | 7.659 | 9.802 | -0.091 |
| Linear Regression | 5.774 | 8.349 | 0.209 |
| Random Forest | 6.311 | 8.003 | 0.273 |

**1. Which model has the lowest MAE?**
- **Linear Regression** (5.774 vs 6.311 for Random Forest).

**2. Which model has the lowest RMSE?**
- **Random Forest** (8.003 vs 8.349).

**3. Which model has the highest R²?**
- **Random Forest** (0.273 vs 0.209).

**4. Did the more complicated model necessarily perform better?**
- **No, the metrics disagree.** Random Forest wins on RMSE and R², Linear Regression wins on MAE. Neither beats the other on every metric.
- Why they disagree: RMSE and R² are dominated by big errors, MAE treats all errors equally.
  - Random Forest averages training scores in its leaves, so it **can't predict above the highest training score**. Its predictions range from 61.6 to 88.3. For row 173 it predicted 84.3 (error 19.5) instead of Linear Regression's 102.1 (error 37.3). Avoiding that one huge miss helps its RMSE and R² a lot.
  - For the typical student, Linear Regression is closer, which gives it the better MAE. Without row 173, Linear Regression would win on both MAE (5.13 vs 6.04) and RMSE (6.54 vs 7.59).
- So "more complex" doesn't automatically mean "better". With 200 training students and a mostly linear relationship (Part 3), the simple model is competitive.
- Which matters more depends on the goal: if big misses are especially costly, RMSE matters more. If typical accuracy matters more, MAE.

**About the reminder:** one split, 50 students, and one student moves the ranking. A different split could easily reverse it.

---

## Part 16: Scaling and Random Forests

**Evidence from the notebook (training data, 194 students with study hours):**
- Raw thresholds (hours): 8.05, 5.35, 10.65
- Standardized thresholds: 0.128, -0.819, 1.04
- Identical training predictions: True
- Standardized thresholds converted back: 8.05, 5.35, 10.65 (exactly the raw ones)

**Talking points for "Does RandomForestRegressor require StandardScaler? Why or why not?"**
- **No.** A tree asks one yes/no question per split: "is study_hours_per_week <= 8.05?" It only cares about the **order** of values, which students fall on each side.
- StandardScaler is a straight-line transformation, `(x - mean) / std`. It changes the numbers but never their order. The student who studied the most is still the highest after scaling.
- So the tree finds the **same split**, just written in different units: 8.05 hours = 0.128 standard deviations above the mean. Same students on each side, same leaf averages, same predictions. The demo shows this: identical predictions, and the scaled thresholds convert back to exactly 8.05, 5.35 and 10.65 hours.
- A Random Forest is many trees averaged, so the same holds for the whole forest.
- Contrast: scaling matters for models that use distances (kNN, SVM) or penalties on coefficient size (Ridge, Lasso).
- Keeping the scaler in the forest's pipeline is harmless, and it keeps the preprocessing identical across models.

---

## Part 17: Experiment, Linear Regression with vs without scaling

**Evidence from the notebook:**

| Model | MAE | RMSE | R² |
|---|---|---|---|
| Linear Regression (scaled) | 5.774 | 8.349 | 0.209 |
| Linear Regression (no scaling) | 5.774 | 8.349 | 0.209 |

| Feature | Scaled (per 1 std) | Unscaled (per 1 unit) |
|---|---|---|
| study_hours_per_week | 5.933 | 2.114 |
| attendance_rate | 1.976 | 0.207 |
| commute_minutes | 0.528 | 0.029 |

**Talking points for the result:**
- **Metrics identical to 3 decimals.** Scaling had no effect on the predictions.
- **The coefficients changed a lot,** because their units changed:
  - Unscaled study hours: +2.11 points per extra hour.
  - Scaled: +5.93 points per extra standard deviation (about 2.8 hours). 2.11 x 2.8 is about 5.9, the same effect in different units.
  - Attendance: +0.21 per percentage point vs +1.98 per std (about 9.6 points).
- **Why:** ordinary least squares finds the best-fitting line. If a feature is divided by its std, the best coefficient is just multiplied by that std, and coefficient x feature stays the same. Same predictions, same errors.
- **Hypothesis supported:** yes, exactly as predicted.
- **So why scale at all for Linear Regression?** Scaled coefficients are comparable (all "per 1 std"). Unscaled, commute's 0.029 looks tiny only because a minute is a small unit. Scaling also matters for regularized models (Ridge, Lasso), which plain LinearRegression isn't.
- This was a planned experiment (hypothesis written first, run once), not tweaking to improve the test score, so it follows the project rules.

---

## Part 18: AI Reflection

This is your personal reflection, so there are no talking points to copy. Moments from this project you could draw on:

- **CSV loading:** the AI loaded the data with `keep_default_na=False, na_values=[""]`. With default loading, pandas reads the real category "None" as missing (95 missing instead of 7). You can verify it with `df["prior_programming_experience"].value_counts(dropna=False)`.
- **Wrong Part 4 prompt:** the first Part 4 prompt (from another assignment) referred to `numeric_features` "from Part 2", which didn't exist. The AI flagged the mismatch. You then supplied the correct prompt.
- **A false premise:** Part 8, Q3 says original scores are whole numbers. The AI checked and found only 27 of 250 are.
- **A note that didn't match the code:** the Part 13 instructions said one-hot coefficients are relative to a "dropped/reference category". The AI pointed out that the encoder drops no category and reworded the note.
- **A truncated prompt:** the Parts 4 to 17 message was cut off at Part 9. The AI built only the fully specified Parts and asked for the rest instead of guessing.
- **Your own checks:** comparing numbers in the guide against notebook outputs, the Part 16 demo (thresholds converting back exactly), and Part 17 (identical metrics) are all ways you verified claims instead of trusting them.
- **Something to question:** "Random Forest has the higher R², so it's better". The Part 15 metrics disagree, and one student (row 173) drives most of the RMSE difference.
