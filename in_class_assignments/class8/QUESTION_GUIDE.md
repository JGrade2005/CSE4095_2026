# Question Guide: Class 2 Classification

Key ideas and evidence for every question in `CSE4095_Class8_Classification.ipynb`.

**How to use this:** these are talking points, not finished answers. Write each answer in your own words (Parts 5 to 7 require it). Numbers come from the notebook's outputs, so point to them as evidence. Parts 13 and 14 do **not** reveal results, so write your prediction before running those cells.

---

## Part 1: Define a Classification Problem

**1. Why is predicting `exam_score` a regression problem?**
- `exam_score` is a continuous number (51.4 to 100 in this data), not a category.
- A regression model predicts a quantity, and its error is a distance ("off by 3 points").

**2. Why is predicting `high_exam_score` a classification problem?**
- It has two discrete labels, Yes and No. The model picks a category instead of a number.
- An error is simply right or wrong. Same students, same data: the *type of target* decides the problem type.

**3. How many students are in each class?** No = 151, Yes = 99 (table and chart in Part 1).

**4. What percentage?** No = 60.4%, Yes = 39.6%. Worth noting: the classes are imbalanced, which matters later for the baseline and stratification.

---

## Part 2: Choose the Features

**Why not `student_id`?**
- It is an arbitrary record-keeping label, unique to each row. It describes nothing about the student's habits.
- A model could memorize individuals ("S117 means Yes") or pick up accidental patterns in how IDs were assigned. Neither helps with new students, who get new IDs.

**Why would `exam_score` be a serious problem?**
- `high_exam_score` was *created from* `exam_score` (`>= 80`). Using it means handing the model the answer. This is **target leakage**.
- The model would just learn "is the score at least 80?" and nothing about habits.
- At prediction time the exam score doesn't exist yet. If you knew it, you wouldn't need a model.
- Part 12 proves it: accuracy jumps to 100%.

---

## Part 3: Split the Data

**1. Purpose of the training set:** the data the model learns from. Everything learned (imputer fill values, scaler mean and std, logistic regression coefficients) comes from these 200 students.

**2. Purpose of the test set:** 50 held-out students the model never sees during training. They stand in for future, unseen students, so the test score estimates real-world performance.

**3. What stratification does:** it keeps the class proportions the same in the train and test sets as in the full data (about 40% Yes in both). Evidence: without stratifying, the test set held anywhere from 11 to 30 "Yes" students. With it, there are always 20.

**4. Why not train on test data:** the model would have seen the answers, so the test score would be too optimistic and would no longer measure performance on new students. It's like studying with the answer key. This applies to preprocessing too (fitting the scaler on test rows).

---

## Part 4: Establish a Baseline

**1. Majority class:** No (121 of 200 training students).

**2. Baseline accuracy:** 60.0% on the test set (30 of 50 are No).

**3. Why it's useful:**
- It is the reference point: a real model must beat 60% to show it learned anything.
- It shows that accuracy can look decent with **zero** learning. The baseline finds 0 of the 20 high scorers (0% recall).
- With imbalanced classes, accuracy alone can hide a useless model.

---

## Part 5: Preprocess the Data (own words)

**1. Why convert categorical variables?**
- Logistic regression multiplies each input by a coefficient and adds them up. You can't multiply "Strong" or "Yes" by a number, so every input has to be numeric.

**2. What one-hot encoding does:**
- It creates one new 0/1 column per category. `prior_programming_experience` becomes 3 columns, so "Some" becomes [None=0, Some=1, Strong=0].
- This avoids inventing a fake order or distance (None=0, Some=1, Strong=2 would claim the gaps are equal).
- Each category gets its own coefficient. In this model, None = -0.929 and Strong = +0.647.

**3. Why handle missing values:**
- scikit-learn's `LogisticRegression` can't accept blanks (NaN). It raises an error.
- Dropping rows would throw away students (9 are missing study hours, 12 sleep, 7 experience) and could bias the data.
- Imputing keeps all students. The fill values are learned from training data only.

**4. What StandardScaler does:**
- For each numeric column it subtracts the training mean and divides by the training standard deviation.
- Each value becomes "how many standard deviations from average". Example from Part 6: 9.5 study hours becomes z = 0.731.

---

## Part 6: Understand Data Scaling

**1. Why scaling helps Logistic Regression:**
- The raw ranges are very different: attendance runs 54 to 100, commute 0 to 145, and sleep 4 to 10.
- Logistic regression's default regularization penalizes large coefficients equally. Without scaling, that penalty hits columns unevenly just because of their units.
- Scaling also helps the solver converge, and it makes coefficients comparable ("the effect of +1 standard deviation").

**2. Does standardization put values between 0 and 1?**
- **No.** It gives mean 0 and std 1, with no fixed range. Values can be negative or larger than 1.
- Evidence from Part 6: attendance goes as low as -3.21, practice reaches 6.15 and commute reaches 6.40.
- Squeezing values into 0 to 1 is a different technique (min-max scaling, `MinMaxScaler`).

**3. Why not use the test set for the mean and std:**
- The test set represents future students. Using its statistics leaks information about it into training, which makes the evaluation slightly optimistic.
- In real use you transform each new student with statistics you already have.
- Evidence: after scaling, the test means are *not* exactly 0 (study hours 0.151). That's expected and correct, because the test set was scaled with the training statistics.

---

## Part 7: Train a Logistic Regression Classifier (own words)

**1. What `.fit()` does:**
- It learns from the training data. In a pipeline it runs each preprocessing step in order, learning and then applying it, and finally fits the logistic regression.
- Logistic regression searches for the coefficients that best separate Yes from No on the training students.

**2. What is learned from the training data:**
- Imputer fill values: medians (for example, 7.4 study hours) and the most common answers ("Some", "Yes").
- The scaler's mean and standard deviation for each numeric column.
- The encoder's list of categories.
- Logistic regression's 10 coefficients plus an intercept (-0.517). The largest are experience None (-0.929), study hours (+0.917) and practice (+0.911).

**3. Why put preprocessing and the classifier in one pipeline:**
- Preprocessing is automatically learned from training data only, which prevents leakage.
- The exact same steps are applied, in the same order, to test data and new students.
- One object to `fit` and `predict`, so there are fewer chances to forget a step (for example, scaling the test set).
- It makes experiments easy: `clone`, `set_params` and `fit_and_score` in Parts 12 to 14 all rely on it.

---

## Part 8: Make Predictions

**`predict()` vs `predict_proba()`:**
- `predict()` returns the final label (Yes or No).
- `predict_proba()` returns a probability for each class (the No and Yes columns add up to 1).
- `predict()` is just `predict_proba()` with a cutoff: P(Yes) >= 0.5 means "Yes".

**Probability near 0.5:**
- The model is uncertain. The student's features resemble both groups, so a small change could flip the prediction.
- Evidence: S133 (0.501) and S081 (0.496). 4 of the 5 least certain predictions were wrong.

**Probability near 0.95:**
- The model is confident. The features strongly resemble past high scorers (for example, S064 at 0.98, actual Yes).
- Confident doesn't mean guaranteed. It is the model's estimate and can still be wrong.

---

## Part 9: Evaluate the Classifier

- **Accuracy:** 42 of 50 predictions were correct, so **84.0%**.
- **Precision (Yes):** of the 16 students predicted Yes, 14 actually were, so **87.5%**. "When it says Yes, it's usually right."
- **Recall (Yes):** of the 20 students who actually scored 80+, the model found 14, so **70.0%**. "It finds 7 out of 10 high scorers."
- **Compared with the baseline:** 84.0% vs 60.0%, which is 24 points better. The baseline's precision and recall are both 0 because it never predicts Yes.

---

## Part 10: Understand the Confusion Matrix

- **TN = 28, FP = 2, FN = 6, TP = 14.**
- **False positives:** 2. **False negatives:** 6.
- **A false positive here:** the model says a student will score 80+, but they score below 80 (S133 scored 66.8, S170 scored 79.6). The cost is that a student who might need help gets false reassurance and could be overlooked.
- **A false negative here:** the model says a student will score below 80, but they score 80+. The cost is that a strong student is underestimated, and if the model were used to assign tutoring, help would go to someone who didn't need it.
- Which mistake is worse depends on what the model is used for. That's a good point to make in your answer.

---

## Part 11: Inspect Individual Errors

**Interesting patterns:**
- All 8 mistakes have P(Yes) between 0.30 and 0.54. The model is never confidently wrong.
- 6 of the 8 are false negatives, so the model leans toward "No" (the majority class).
- Several false negatives report habits closer to the typical "No" student. S038, S081 and S100 studied 5.5 to 5.7 hours, while correctly predicted Yes students had a median of 10.4.
- Two of the missed students had imputed values: S090 (study hours) and S100 (experience).
- False positives: S170 scored 79.6, just under the cutoff. S133 had strong attendance and study hours but scored 66.8.

**A hypothesis (careful language):**
- "The model *may* have struggled with these students because their recorded habits *resemble* the other class."
- "The habit features likely capture only part of what goes into an exam score, and the hard 80 cutoff turns students near the line into opposite labels."
- Avoid causal claims like "low study hours caused the score". Say "was associated with" or "looked similar to".

---

## Part 12: Target Leakage Experiment

**1. What happened:** accuracy rose from 84.0% to **100%**, and precision and recall also reached 100%.

**2. Why:** the target is literally `exam_score >= 80`, so the model only had to learn that one cutoff. Evidence: the `exam_score` coefficient is 4.63, compared with 0.23 or less for everything else, and study hours dropped to 0.01. The habits were ignored.

**3. Why the model is invalid despite the accuracy:**
- `exam_score` isn't available when the prediction must be made. If it were, no prediction would be needed.
- The model learned the *definition* of the label, not patterns in student habits.
- It would be useless in practice. Its high accuracy comes from leakage, not insight.

---

## Part 13: quiz_average Experiment (results not shown here)

**Before running, think about:** quiz_average has the strongest correlation with exam score of any column (r = 0.77, compared with 0.52 for study hours). Quizzes and the exam both measure how well a student knows the material.

**After running, answer from your output table:** which of accuracy, precision and recall changed, in which direction, and by how much. Then say whether your prediction matched.

**Is quiz_average available at prediction time?**
- It depends on *when* the prediction is made. This model's purpose is to predict from **habits**, for example early in the term to find students who need support.
- Quiz averages build up *during* the course, so at the start they don't exist yet.
- Even late in the term, a quiz is itself an assessment of the same knowledge as the exam. That makes it close to an earlier version of the outcome rather than a habit.

**Statistically useful but inappropriate:**
- When you evaluate on historical data, every column is already filled in, so a feature can look very helpful.
- If the real system can't see that feature when it has to predict, the evaluation promises performance it can never deliver. This is sometimes called *temporal leakage*.
- Analogy: predicting whether it will rain using whether the ground was wet that evening.

---

## Part 14: Your Experiment (results not shown here)

The notebook explains the change in "What this experiment changes" just above your hypothesis cell.

**For the "What happened" questions after running:**
- **Supported or not?** Compare each metric's direction with what you predicted.
- **How did recall and precision change?** Compare the two confusion matrices: how many students moved from false negative to true positive, and from true negative to false positive?
- **Would accuracy alone show the change?** Look at whether accuracy moved compared with how much the other metrics moved.
- **Which model would you choose?** Tie it to a purpose. Is the goal to find as many high scorers as possible, or to make sure every "Yes" is trustworthy?

---

## Part 15: AI Reflection

Pick at least one real situation from this session and answer all 5 questions in your own words. Candidates:

| Situation | What the AI suggested | How it was verified |
|---|---|---|
| **AI assumption corrected** | It left out `commute_minutes` and called `quiz_average` leakage, based on the starter notebook and the first prompt | You compared it with the full assignment, which requires commute in Part 2 and treats quiz as a Part 13 experiment. The AI then fixed the notebook |
| Pipeline construction | Median and scaler for numbers, most-frequent and one-hot for categories, all in one `ColumnTransformer` and `Pipeline` | Shape check (200, 10), 0 missing values, 84% vs a 60% baseline |
| Reading "None" correctly | `keep_default_na=False` so "None" (no experience) isn't read as missing | The categories check shows None, Some and Strong all present |
| Stratification | Use `stratify=y` | The 1,000-split comparison: 11 to 30 Yes students vs always 20 |
| Debugging | Your Step 2 and 3 edits weren't saved | The AI checked the file's timestamp before reviewing |
| Experiment ideas | Five Part 14 options, with results held back | You chose class_weight and wrote your own hypothesis |

For question 4 (assumptions), the commute and quiz correction is the strongest example, because it's exactly what the assignment warns about: AI producing valid code for the wrong specification.
