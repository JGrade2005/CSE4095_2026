# Answer Guide: Class 10, Comparing Models Fairly

Key ideas and evidence for every question in `CSE4095_Class10_Starter.ipynb`.

**How to use this:** these are talking points, not finished answers. Write each answer in your own words. Numbers come from the notebook's outputs, so point to them as evidence.

---

## Part 1: Define the Classification Target

**1. What are you trying to predict?**
- Whether a student gets a high exam score: `high_exam_score` is "Yes" if `exam_score` >= 80, otherwise "No".
- The prediction is made from the student's habits (study hours, sleep, attendance, and so on), before the exam happens. That is what makes it useful: you could spot students who need help early.
- Good answers name both the target column and the cutoff (80).

**2. Why is this a classification problem?**
- The target has two discrete labels, Yes and No. The model picks a category, not a number.
- A prediction is simply right or wrong. There is no "off by 3 points" like there would be with `exam_score`.
- Contrast: predicting `exam_score` itself (a continuous number, 51.4 to 100 here) would be regression. Same students, same data. The type of target decides the problem type.
- Because there are exactly two classes, it is called **binary** classification.

**3. What percentage of students belong to each class?**
- No = 60.4% (151 students), Yes = 39.6% (99 students), out of 250. Evidence: the `class_table` output and the bar chart in Part 1.
- They add up to 100%, which is a quick sanity check.

**4. Is the dataset approximately balanced?**
- Not perfectly. It is a 60/40 split, about 1.5 No students for every Yes student. A good way to describe it is **mildly imbalanced**: not 50/50, but nowhere near severe (like 95/5).
- Why it still matters:
  - A model that always guesses "No" would already be right 60.4% of the time without learning anything. That is the baseline a real model has to beat.
  - Accuracy alone can hide a weak model, so recall and F1 for the "Yes" class are worth reporting too.
  - It is the reason for stratifying: `StratifiedKFold` and a stratified train/test split keep about 40% Yes in every fold and split, so each model is scored on the same mix.
- Extra detail if you want it: no student scored exactly 80, but 33 students scored between 78 and 82. Those students sit right next to the cutoff, so they will be the hardest to classify.

---

## Part 2: Define X and y

**1. Why would using `exam_score` be target leakage?**
- **Leakage definition:** target leakage means a feature gives the model information about the answer that it would not have at prediction time.
- **The label is built from it.** `high_exam_score` is literally `exam_score >= 80` (Part 1). Giving the model `exam_score` hands it the answer. It only has to learn "is this number at least 80?", which is right for all 250 students.
- **It doesn't exist yet when you predict.** The point is to predict from habits *before* the exam. If you already had the exam score, you wouldn't need a model.
- **Results would look perfect but be fake.** Accuracy would be about 100% in cross-validation, and it would tell you nothing about how habits relate to high scores. In class 8, adding `exam_score` gave 100% on every metric, and its coefficient (4.62) swamped the biggest habit (0.23).
- A strong answer names all three ideas: built from the target, not available at prediction time, misleadingly perfect scores.

**Context for the other excluded columns (not asked, but useful if it comes up):**
- `student_id`: an arbitrary label, unique per student. A model could memorize individuals, which doesn't help with new students.
- `quiz_average`: measured during the course, so it may not be known at prediction time, and it measures the same skill as the exam (r = 0.77 with `exam_score`). It's a borderline case rather than pure leakage, which is why it's left out of the main model.

**About the feature types (from `X.dtypes`):**
- Numerical (5): `study_hours_per_week`, `sleep_hours_per_night`, `attendance_rate`, `practice_problems_per_week`, `commute_minutes`. Their dtypes are `float64` or `int64`.
- Categorical (2): `prior_programming_experience` (None / Some / Strong) and `study_group` (Yes / No). Their dtype is `str` (text).
- `prior_programming_experience` actually has an order (None < Some < Strong), so it's *ordinal*. It's still treated as categorical here, so it gets one-hot encoded instead of being turned into made-up numbers like 0, 1, 2.

---

## Part 3: Train/Test Split

**Evidence from the notebook:** train = 200 students (121 No, 79 Yes), test = 50 students (30 No, 20 Yes). Yes is 39.6% overall, 39.5% in train, 40.0% in test, so stratification worked.

**1. Why are we holding the test set aside?**
- The test set stands in for **future, unseen students**. Its score estimates how the model will do in the real world.
- That estimate is only honest if the model, and every decision about the model, never saw those 50 students. Once they influence a choice, they stop being "unseen".
- Training data is for learning (fitting the model, imputer, scaler). Cross-validation on the training data is for comparing and choosing. The test set is for **one final check** at the end (Part 15).
- Analogy: the test set is the final exam. You can practise as much as you like on practice problems (training/CV), but if you see the exam questions in advance, your grade no longer shows what you actually know.

**2. What could happen if we repeatedly check test accuracy while modifying our model?**
- Each time you look at the test score and change something in response, information about the test set leaks into your choices. You end up **tuning the model to those 50 specific students** (overfitting to the test set).
- The final test score becomes **too optimistic**. It reflects how well you fitted these 50 students, not how well the model works on new ones, so performance on real new students is likely to be worse.
- You also lose your only unbiased measurement. There is no clean data left to check the model honestly.
- Why it's easy to fool yourself here: with 50 test students, **one student = 2 percentage points** of accuracy. Small, random differences can look like real improvements, and if you keep trying changes, one of them will "win" by luck.
- Fix: compare and tune with cross-validation on the training set (the shared `cv` folds), then evaluate on the test set once.

---

## Part 4: Preprocessing Pipeline

**Evidence you can point to (training set, 200 students):**

| Feature | min | max | std |
|---|---|---|---|
| study_hours_per_week | 0.3 | 17.8 | 2.9 |
| sleep_hours_per_night | 4.3 | 10.0 | 1.1 |
| attendance_rate | 54.4 | 100.0 | 9.7 |
| practice_problems_per_week | 0 | 78 | 10.0 |
| commute_minutes | 0 | 145 | 18.8 |

Missing in the training set: study hours 6, sleep 11, prior experience 5. So the imputers really are needed.

**1. Why should preprocessing be included inside the pipeline?**
- **Fit on training data only.** The imputer's medians, the scaler's mean and std, and the encoder's categories are all *learned* values. Inside a pipeline, `fit` learns them from the training data only, and `predict` just applies them to new data. Nothing is learned from data the model is evaluated on.
- **Same steps every time.** New data goes through exactly the same transformations automatically. You can't forget a step or apply it in a different order at prediction time.
- **One object.** The whole workflow (clean, scale, encode, model) is fitted, cross-validated, and evaluated as one unit. That keeps the code simple and makes model comparisons fair, because every model gets identical preprocessing through `make_pipeline_for`.

**2. Why is this especially important when using cross-validation?**
- In each CV round, one fold plays the role of "unseen" data. If you preprocess the whole training set *before* CV, the medians and scaler statistics were computed using that validation fold too. That's a small leak: the validation fold is no longer truly unseen, so the CV score is slightly too optimistic.
- When the pipeline is passed to `cross_validate`, the preprocessing is **re-fitted inside every fold** on that fold's training part only. Each validation fold is treated exactly like the test set will be later.
- Concrete example from this data: the median of `study_hours_per_week` is 7.4 on all 200 training students, but 7.3 to 7.5 depending on which fold is held out. The differences are small here, but the principle matters more with bigger effects (target encoding, feature selection, oversampling).
- Fair comparison: every model is evaluated with identical, leak-free preprocessing on identical folds (`cv`).

**3. Which of the models in this assignment are sensitive to feature scaling?**
- The assignment's models (Part 7) are the majority baseline, Logistic Regression, Decision Tree, and Random Forest. Scale-sensitive models are the ones that use **distances or coefficient sizes**:
  - **Logistic Regression: yes. It's the only one of the four.** Regularization (on by default, `C=1.0`) penalizes all coefficients the same way. A feature measured in big units (commute 0 to 145) needs a tiny coefficient and one in small units (sleep 4.3 to 10) needs a big one, so the penalty treats them unfairly. Unscaled data can also make the solver converge slowly.
  - **DummyClassifier (baseline): no.** It ignores the features entirely.
  - **Decision Tree / Random Forest: no** (see Q4).

**4. Do Decision Trees and Random Forests generally require scaling?**
- **No.** A tree splits one feature at a time with a threshold, like "attendance_rate <= 82.5". Scaling changes the threshold's number but not *which students end up on each side*, so the splits and predictions are the same.
- A Random Forest is many trees, so the same reasoning applies.
- They never compare different features to each other or compute distances, so units don't matter.
- It's still fine to leave the scaler in the shared preprocessor. It doesn't hurt trees, and it keeps the preprocessing identical for every model, which is what makes the comparison fair.
- Caveat: trees still need missing values filled and categories turned into numbers in scikit-learn, so the imputers and one-hot encoder are still needed.

---

## Part 5: Establish a Baseline

**Evidence:** fold accuracies 0.625, 0.600, 0.600, 0.600, 0.600. Mean 0.605, std 0.010.

**1. What does the baseline do?**
- `DummyClassifier(strategy="most_frequent")` ignores every feature. During `fit` it only counts which label is most common in the training folds ("No"), then predicts "No" for every student.
- It's not meant to be a real model. It's a reference point: "how well can you do without learning anything?"

**2. What is its mean CV accuracy?**
- 0.605 (60.5%). That matches the share of "No" in `y_train` (121 of 200 = 60.5%), which is exactly what you'd predict if it always guesses "No".
- Why fold 1 is different (0.625): Part 6 shows fold 1 has 37.5% Yes (15 of 40), so it has 25 No students, and 25/40 = 0.625. The other folds have 16 Yes / 24 No, so 24/40 = 0.600.
- The std is tiny (0.010) because stratification keeps the class mix nearly identical in every fold.

**3. Why should our machine-learning models be compared with this baseline?**
- It sets the bar. A model's accuracy only means something compared with what you'd get for free. 74% sounds fine on its own, but the real story is "about 13 points better than always guessing No".
- With imbalanced classes, accuracy can look decent with zero learning. The baseline gets 60.5% accuracy but **0% recall**: it never finds a single high scorer (see Part 8).
- If a model can't clearly beat the baseline, its features aren't adding useful information, or something is broken.

---

## Part 6: Understand Cross-Validation

**Evidence:** every fold has 160 training rows and 40 validation rows. % Yes in validation: 37.5, 40.0, 40.0, 40.0, 40.0.

**1. What happens during 5-fold cross-validation?**
- The 200 training students are split into 5 groups of 40 (folds). `StratifiedKFold` keeps about 40% Yes in each.
- The model is trained 5 times. Each round, 4 folds (160 students) are used to fit (preprocessing included) and the 5th fold (40 students) is used to score.
- Every student is in the validation fold exactly once. You get 5 scores, then report the mean (typical performance) and std (how much it varies).

**2. How many times is each model trained?**
- 5 times during CV, once per fold. Each time it's a fresh, unfitted copy.
- Detail for a strong answer: `cross_validate` doesn't keep any of those 5 fitted models. When you later want a final model (Part 15), you train it a 6th time on all 200 training students.

**3. Why is cross-validation more informative than a single training/validation split?**
- One split gives one number, and that number depends on which 40 students happened to land in validation. With 40 students, one student moves accuracy by 2.5 points.
- CV gives 5 numbers. The mean is more stable, and the std tells you how much luck is involved. One split can't tell you that.
- Every training student gets used for both training and validation, so no data is "wasted".
- Evidence from Part 8: Logistic Regression's fold accuracies range from 0.65 to 0.85. A single split could have reported either one.
- Link to class 9: one test student (S174) caused about 40% of Linear Regression's squared error and decided which model "won" on RMSE.

**4. Why do we still keep a separate final test set?**
- CV scores are used to **make choices** (which model, which depth). Once you pick the model with the best CV score, that score is slightly optimistic, because you picked a winner and part of winning can be luck.
- The test set was never used for any choice, so it gives an honest, independent estimate at the very end.
- In short: CV is for choosing, the test set is for confirming.

---

## Part 7: Create the Three Models (no questions)

Quick reference for later answers:
- **Logistic Regression:** learns one weight per feature, adds them up, and turns the total into a probability of "Yes". Simple, fast, scale-sensitive.
- **Decision Tree (depth 4):** a flowchart of up to 4 yes/no questions ("attendance <= 82?"). Easy to read. Depth limits how complex it can get.
- **Random Forest (200 trees):** each tree is trained on a random resample of students and considers random subsets of features. The trees vote. Usually more stable than one tree, but harder to interpret.

---

## Part 8: Compare the Models with Cross-Validation

**Evidence (from the comparison table):**

| Model | Mean CV Accuracy | Std. Accuracy | Mean Precision | Mean Recall |
|---|---|---|---|---|
| Majority baseline | 0.605 | 0.010 | 0.000 | 0.000 |
| Logistic Regression | 0.740 | 0.064 | 0.728 | 0.571 |
| Decision Tree (depth 4) | 0.670 | 0.040 | 0.598 | 0.493 |
| Random Forest | 0.690 | 0.072 | 0.642 | 0.518 |

Per-fold accuracy (not in the notebook, but useful):
- Logistic Regression: 0.725, 0.650, 0.850, 0.750, 0.725
- Decision Tree (depth 4): 0.700, 0.625, 0.725, 0.675, 0.625
- Random Forest: 0.625, 0.650, 0.800, 0.750, 0.625

**1. Which model has the highest mean CV accuracy?**
- Logistic Regression, 0.740. Random Forest 0.690, Tree 0.670, baseline 0.605.

**2. How large are the differences?**
- LR vs RF: 0.050. LR vs Tree: 0.070. RF vs Tree: 0.020. All three real models beat the baseline by 0.065 to 0.135.
- Compare with the stds (0.04 to 0.07):
  - **RF vs Tree (0.020)** is smaller than either std, so they're effectively tied.
  - **LR vs RF (0.050)** is about the size of one std. That's suggestive, not conclusive. It's a good place for "slightly higher" language.
  - Extra evidence: since every model uses the same folds, you can compare fold by fold. LR is at least as good as RF in all 5 folds (better in 3, tied in 2) and better than the tree in all 5. That makes LR's lead more believable than the means alone suggest.
- One student in a fold is 0.025, so a 0.050 gap is about 2 students per fold.

**3. Which model has the highest recall?**
- Logistic Regression, 0.571. It finds about 57% of the actual high scorers. The tree finds 49%, the forest 52%, and the baseline 0%.
- All models miss over 40% of high scorers. Recall is the weakest metric for every model.

**4. Do all metrics identify the same model?**
- Yes, in this table LR is highest on accuracy, precision (0.728), and recall (0.571).
- But not on stability: LR's std (0.064) is higher than the tree's (0.040). If you value consistency, the tree is the most stable real model, though it's also the least accurate.
- In general metrics can disagree (as RMSE vs MAE did in class 9), so it's worth checking all of them.

**5. How much does performance vary between folds?**
- The baseline barely varies (std 0.010). The real models vary a lot more: std 0.040 (Tree), 0.064 (LR), 0.072 (RF).
- In concrete terms: LR ranges from 0.650 to 0.850 depending on which 40 students are held out. That's a 20-point spread from one model.
- Fold 3 is the "easy" fold for every model (LR 0.85, RF 0.80, Tree 0.725) and fold 2 is hard for all of them. So part of the variation comes from **which students** are in the fold, not just from the model.
- That's why one train/validation split would be risky, and why small differences between means should be described cautiously.

---

## Part 9: Hyperparameters

**In my own words (using max_depth as the example)**, talking points:
- A **parameter** is learned by `fit()` from the training data. For a tree: which feature to split on, the cut-off value, and the prediction at each leaf. Example from this data: every tree's first question is "study_hours_per_week <= 5.05?". Nobody typed that in, the tree found it.
- A **hyperparameter** is a setting you choose *before* training. It controls *how* the model learns. `max_depth` limits how many questions in a row the tree can ask. `fit()` never changes it.
- Same data, different `max_depth`: depth 1 gives 2 leaves, depth 4 gives 12 leaves, no limit (None) grows to depth 11 with 44 leaves. The hyperparameter sets the size of the box, the parameters fill it.
- Because `fit()` can't choose hyperparameters, you compare values with cross-validation (Parts 10 to 13), never with the test set.
- Other examples in this notebook: `max_iter` (LR), `n_estimators` (RF) are hyperparameters. LR's coefficients are parameters.

---

## Part 10: Experiment with Decision-Tree Depth (no questions)

| max_depth | Training Accuracy | CV Accuracy | CV Std | Gap (Train − CV) |
|---|---|---|---|---|
| 1 | 0.661 | 0.560 | 0.066 | 0.101 |
| 2 | 0.712 | 0.625 | 0.057 | 0.088 |
| 3 | 0.772 | 0.610 | 0.051 | 0.162 |
| 4 | 0.826 | 0.670 | 0.040 | 0.156 |
| 6 | 0.925 | 0.615 | 0.056 | 0.310 |
| 8 | 0.979 | 0.620 | 0.043 | 0.359 |
| None | 1.000 | 0.595 | 0.060 | 0.405 |

Reference points: baseline CV accuracy 0.605. Logistic Regression 0.740, Random Forest 0.690 (Part 8).

---

## Part 11: Visualize Model Complexity

**1. What happens to training accuracy as max_depth increases?**
- It rises every single step: 0.661 → 0.712 → 0.772 → 0.826 → 0.925 → 0.979 → 1.000.
- With no depth limit it reaches 100%: the tree memorizes every training student. Deeper trees can always carve out smaller groups, so training accuracy can only go up.

**2. What happens to cross-validation accuracy?**
- It does **not** follow training accuracy. It rises from 0.560 (depth 1) to a peak of 0.670 (depth 4), then falls back to 0.615 to 0.620 (depths 6 and 8) and 0.595 (None).
- It's bumpy, not a smooth hill: depth 3 (0.610) is lower than depth 2 (0.625). With 40 students per fold, differences of 0.01 to 0.02 are within noise.

**3. At what depth does the tree appear to perform best on unseen data?**
- Depth 4 has the highest mean CV accuracy (0.670) and also the lowest std (0.040).
- Use "appears to": its lead over depth 2 (0.625) is 0.045, about one std.

**4. Do you see evidence of underfitting?**
- Yes, at depth 1. Training accuracy is only 0.661, and CV accuracy (0.560) is actually **below the baseline (0.605)**. One question ("study hours <= 5.05?") is too simple to separate high and low scorers well. Doing worse than always guessing "No" is a strong sign.
- Depth 2 is also fairly simple (training 0.712), but its CV score is close to the top.

**5. Do you see evidence of overfitting?**
- Yes, from depth 6 onward. Training accuracy shoots up (0.925, 0.979, 1.000) while CV accuracy goes down (0.615, 0.620, 0.595). On the plot the two lines spread apart.
- Depth None is the clearest case: 100% on training students, 59.5% on held-out students, below the baseline.

---

## Part 12: Underfitting and Overfitting

**1. Which depth appears to underfit?** Depth 1. Low training (0.661) and low CV (0.560), with CV below the baseline. Both scores are poor, which is the underfitting pattern. (A small gap of 0.101 doesn't mean it's good. It means it's equally bad on both.)

**2. Which depth appears to generalize best?** Depth 4: highest CV (0.670), lowest CV std (0.040). Its gap (0.156) is moderate, similar to depth 3 (0.162). Depth 2 has the smallest gap (0.088) but lower CV accuracy. Mention the trade-off.

**3. Do the deepest trees show signs of overfitting?** Yes. Gaps of 0.310 (depth 6), 0.359 (depth 8), 0.405 (None). The gap grows with every extra level past depth 4, and CV accuracy doesn't improve to make up for it.

**4. Why should we not simply choose the tree with the highest training accuracy?**
- Highest training accuracy is depth None (1.000), which has one of the worst CV scores (0.595, below the baseline).
- Training accuracy measures how well the model fits students it has already seen, including their noise and quirks. It rewards memorizing. We care about **new** students, which is what CV estimates.
- Training accuracy always goes up with depth, so "pick the highest" would always pick the most complex model.

---

## Part 13: Select a Decision-Tree Depth

**Facts to use (your decision, not filled in):**
- Ranked by CV: 4 (0.670), 2 (0.625), 8 (0.620), 6 (0.615), 3 (0.610), None (0.595), 1 (0.560).
- "Roughly tied" cutoff = 0.670 − 0.040 = 0.630. Only depth 4 clears it. **Depth 2 misses by 0.005**, and one student in one fold changes the mean by 0.005. So depth 2 is borderline. With depth 2's own std (0.057), the two overlap.
- Things to weigh in your reasoning:
  - **Mean CV performance:** depth 4 is highest.
  - **Variability:** depth 4 has the lowest std (0.040), so it's also the most consistent across folds.
  - **Complexity:** depth 2 is much simpler (at most 4 leaves vs 12) and has the smallest gap. The "prefer the simpler model when roughly tied" rule applies only if you treat 4 and 2 as tied.
- Note: depth 4 is the same model as `tree_d4` in Part 8. If you choose 4, the "tuned" tree in Part 14 will have the same scores as the depth-4 row. That's fine, and worth saying: tuning confirmed the original choice.
- Context: even the best tree (0.670) is below Logistic Regression (0.740) and Random Forest (0.690) from Part 8.

---

## Part 17: Why Not Tune Using the Test Set?

**1. What is wrong with the first procedure?**
- The test set is used to make decisions. Every "check test accuracy, then change something" round picks whatever happens to work best on those specific 50 students.
- After enough rounds, the model is fitted to the test set, including its noise. The final test score looks better than the model really is.

**2. How has the test set indirectly become part of model development?**
- The model never trains on test rows directly, but **you** do: you look at test scores and keep the changes that raise them. Information flows from the test set into the model through your choices (features, depth, which model).
- It's like training with an extra step. The data is used for selection, which is a form of fitting.
- Link to class 8: the quiz_average and class_weight experiments were each judged by their test scores. That was Workflow 1.

**3. Why is the final test score no longer a completely independent evaluation?**
- An independent evaluation needs data that had no influence on the model. After repeated checks, the test set helped choose the model, so it isn't independent.
- With small test sets, random luck is big (50 students: 1 student = 2 points). If you try 10 variations, the one that scores best on the test set is partly the luckiest. Its score is biased upward. This is called **selection bias** or "overfitting to the test set".

**4. Why is the second workflow preferable?**
- All comparing and tuning uses CV on the training set. Each decision is based on 5 validation folds (more stable than one test set).
- The test set is used **once**, after every choice is final, so its score is an honest estimate for new students.
- If the test score roughly matches the CV estimate, that's evidence the process worked. If it's much lower, it warns you something went wrong.
- It also mirrors real life: once a model is deployed, the "test set" is future students you can't tune on.

---

## Part 18: Scaling and Different Models

**Evidence from the demo (attendance_rate only, 200 training rows):**

| Raw threshold | Scaled threshold | Scaled, converted back |
|---|---|---|
| 91.60 | 0.646 | 91.60 |
| 80.75 | -0.480 | 80.75 |
| 98.15 | 1.326 | 98.15 |

Predictions identical for 200 of 200 rows. Training attendance mean is about 85.3, std about 9.7.

**1. Why is scaling useful for Logistic Regression?**
- LR multiplies each feature by a coefficient and adds them up. Feature units affect the size of each coefficient: commute (0 to 145 minutes) needs a tiny coefficient, sleep (4.3 to 10 hours) a big one.
- **Regularization** (on by default) penalizes large coefficients. Without scaling, it punishes features unfairly just because of their units. With scaling, every feature is on the same footing (mean 0, std 1).
- **Optimization:** the solver finds the coefficients step by step. Features on similar scales converge faster and more reliably.
- **Interpretation:** scaled coefficients can be compared with each other. A coefficient then means the effect of a one-std change in that feature.

**2. Why do Decision Trees generally not require scaling?**
- A tree asks one feature at a time, "is attendance <= 80.75?". Scaling changes the number in the question (80.75 becomes -0.480) but not the order of the students, so the same students go left and right.
- The demo proves it: converted back, the scaled thresholds are exactly the raw ones (91.60, 80.75, 98.15), and all 200 predictions match.
- Trees never add features together or measure distances, so units never mix.

**3. Why do Random Forests generally not require scaling?**
- A Random Forest is a collection of decision trees that vote. Each tree is unaffected by scaling for the reason above, so the vote is too.
- The randomness (bootstrap samples, random feature subsets) is about which rows and columns each tree sees, not the units of the values.

---

## Part 14: Compare the Tuned Tree Again

**Evidence (`final_comparison`):**

| Model | Mean CV Accuracy | Std. Accuracy | Mean Precision | Mean Recall |
|---|---|---|---|---|
| Majority baseline | 0.605 | 0.010 | 0.000 | 0.000 |
| Logistic Regression | 0.740 | 0.064 | 0.728 | 0.571 |
| Decision Tree (depth 4) | 0.670 | 0.040 | 0.598 | 0.493 |
| Tuned Decision Tree (depth = 4) | 0.670 | 0.040 | 0.598 | 0.493 |
| Random Forest | 0.690 | 0.072 | 0.642 | 0.518 |

**Things to weigh for "the model I will carry forward is ___ because ___" (your decision):**
- The tuned tree is identical to the depth-4 tree, because depth 4 was chosen. Tuning confirmed the original setting rather than improving it.
- Compare means, spread, and every metric, as in Part 8: which model leads on accuracy, precision, and recall? How big is each lead compared with the std? Does one model win fold by fold (Part 8 guide)?
- Stability vs score: the trees have the lowest std (0.040), but the lowest scores of the three real models.
- Simplicity and interpretability can be a tiebreaker when scores are close.
- The choice must be based on CV only. The test set hasn't been used yet, and that's the point.

---

## Part 15: Final Test Evaluation

**Evidence:**

| | CV mean (Part 14) | Test result |
|---|---|---|
| Accuracy | 0.740 | 0.840 |
| Precision | 0.728 | 0.875 |
| Recall | 0.571 | 0.700 |

Confusion matrix: TN 28, FP 2, FN 6, TP 14. Majority-class test accuracy: 0.600 (always "No", 30 of 50).

**1. How does final test accuracy compare with mean CV accuracy?**
- Test accuracy 0.840 is 0.100 **higher** than the CV mean of 0.740. That's 42 of 50 correct.
- LR's CV std was 0.064, so the test score is about 1.5 std above the mean. Its fold scores ranged 0.650 to 0.850, and the test score falls inside that range.

**2. Is it reasonably consistent with CV?**
- Yes, reasonably. It's within the range CV showed was possible, and it is **not lower** than CV, which is what you'd worry about (a big drop would suggest overfitting or a leak).
- Why it can come out higher:
  - **Small test set:** 50 students, one student = 0.02. The test set may simply contain more "easy" students. At CV-level performance (0.74) the model would get 37 of 50 right. It got 42, so just 5 extra students explain the whole 0.10 gap.
  - **More training data:** the final model trained on all 200 students, CV models on 160.
- Cautious phrasing: "consistent with CV, at the optimistic end of the range". Don't claim the model is "really" 84% accurate. CV's 0.74 averaged over 200 held-out predictions is arguably the more stable estimate.
- Context: this matches class 8 exactly (0.84 / 0.875 / 0.70, TN 28 FP 2 FN 6 TP 14). Same model, same features, same split, so the same result is expected.

**3. Did the model outperform the majority-class baseline?**
- Yes. 0.840 vs 0.600, a gain of 0.24 (12 more students correct out of 50).
- The baseline finds 0 of the 20 high scorers (recall 0). The model finds 14 of 20.

**4. Are precision and recall similar to the CV results?**
- Both are higher on the test set: precision 0.875 vs 0.728, recall 0.700 vs 0.571.
- The **pattern** is the same as CV: precision is higher than recall. When the model says "Yes" it's usually right (14 of 16), but it still misses high scorers (6 of 20). It's cautious about predicting "Yes".
- Precision on the test set rests on only 16 "Yes" predictions, so one more wrong "Yes" would drop it to 0.824. Small counts move these numbers a lot.

---

## Part 16: Analyze the Final Errors

**Evidence (all 8 mistakes, with the model's probability of "Yes"):**

| Student | Actual | Predicted | P(Yes) | exam_score |
|---|---|---|---|---|
| S133 | No | Yes | 0.501 | 66.8 |
| S170 | No | Yes | 0.541 | 79.6 |
| S114 | Yes | No | 0.469 | 88.6 |
| S081 | Yes | No | 0.496 | 87.9 |
| S141 | Yes | No | 0.484 | 85.0 |
| S038 | Yes | No | 0.338 | 80.1 |
| S090 | Yes | No | 0.299 | 82.0 |
| S100 | Yes | No | 0.331 | 85.8 |

P(Yes) isn't in the notebook (it comes from `final_model.predict_proba`), but it's useful evidence.

Group means (from `group_means`):

| | False positives | False negatives | Correct |
|---|---|---|---|
| study_hours_per_week | 9.55 | 7.30 | 7.86 |
| sleep_hours_per_night | 6.60 | 6.85 | 6.89 |
| attendance_rate | 95.60 | 82.22 | 85.91 |
| practice_problems_per_week | 16.00 | 19.00 | 17.19 |
| commute_minutes | 22.50 | 26.33 | 22.19 |

**1. How many false positives occurred?** 2 (S133, S170). Predicted Yes, actually No.

**2. How many false negatives occurred?** 6. Predicted No, actually Yes. Three times as many as false positives, matching the "precision higher than recall" pattern.

**3. Do you notice any patterns among the mistakes?**
- **False positives looked like high scorers on paper:** more study hours (9.55 vs 7.86 for correct predictions) and very high attendance (95.6% vs 85.9%). Their habits pointed to "Yes", but their scores didn't.
- **False negatives looked like average students:** lower study hours (7.30) and lower attendance (82.2%) than the correct group. Their habits pointed to "No", but they scored 80+.
- So the model's mistakes are students whose **habits didn't match their outcome**. That's what you'd expect from a model that predicts outcomes from habits.
- **Most mistakes were close calls:** P(Yes) was between 0.30 and 0.54 for all 8. Five were between 0.47 and 0.54, a coin flip.
- **Some sat right at the cutoff:** S170 scored 79.6 (0.4 below 80), S038 80.1, S090 82.0. Of the 4 test students who scored between 78 and 82, 3 were misclassified.
- Caution: only 2 FPs and 6 FNs, so group means are based on tiny groups. One student can move a mean a lot. The test set also has blanks (study hours 3, sleep 1, prior experience 2), which the means skip.
- Use non-causal language: "missed students tended to have lower attendance", not "low attendance caused the miss".

**4. Are some observations likely more difficult to classify than others?**
- Yes:
  - **Students near the 80 cutoff.** A student at 79.6 and one at 80.1 are almost identical, yet get opposite labels. Small differences in habits can't reliably separate them.
  - **Students whose habits don't match their result.** The features don't capture everything (test-day factors, prior knowledge, how well they study, not just how long). Those students will always be hard from habits alone.
  - **Students with missing values.** Imputed values are guesses (medians), so the model has less real information about them.

---

## Part 19: Your Controlled Experiment (5-fold vs 10-fold CV)

**A correction to your hypothesis (it's kept exactly as written in the notebook):**
- It says "each fold will use 10% of the data for training, and 90% for testing". That's reversed. With 10 folds, each round **trains on 90%** (180 students) and **validates on 10%** (20 students). Your next sentence ("the models train on more data 90%") has it right. You may want to address this in your results answer.

**Evidence:**

| Model | 5-fold mean | 5-fold std | 10-fold mean | 10-fold std |
|---|---|---|---|---|
| Logistic Regression | 0.740 | 0.064 | 0.735 | 0.092 |
| Decision Tree (depth 4) | 0.670 | 0.040 | 0.650 | 0.089 |
| Random Forest | 0.690 | 0.072 | 0.670 | 0.100 |

Training rows per fold: 160 (5-fold) vs 180 (10-fold). Validation rows: 40 vs 20.

**Talking points for "Results and whether they support my hypothesis":**
- **Higher accuracy: not supported.** 10-fold means are slightly *lower* for all three models (by 0.005 to 0.020). These differences are smaller than one std, so the fair conclusion is "about the same", not "10-fold is worse".
- **More reliable estimate: not supported, at least not by the fold std.** The std went *up* for every model (0.064 → 0.092 for LR). Each 10-fold validation set has only 20 students, so one student = 0.05. Single folds are much noisier. LR's 10-fold scores range from 0.55 to 0.85.
- **Subtle point (bonus):** a higher fold std doesn't automatically mean a worse estimate of the *mean*, because 10-fold averages over 10 scores instead of 5. The standard error (std / √folds) is nearly identical: LR 0.029 vs 0.029, RF 0.032 vs 0.032, Tree 0.018 vs 0.028. So 10-fold didn't make the mean more precise here either.
- **Your bias reasoning is a real idea:** training on more data per fold (180 vs 160) makes each fold's model a little closer to the final model trained on all 200, so the estimate should be slightly less pessimistic. But 160 vs 180 is a small change, and that effect is too small to see under the noise here.
- **Cost:** 10-fold trains each model 10 times instead of 5, double the computation for no visible benefit on this dataset.
- **Controlled-experiment check:** only the number of folds changed. The same models, preprocessing, training data, `shuffle=True`, and `random_state=42` were used, and the test set wasn't touched. One limitation worth mentioning: each result comes from one particular shuffle (random_state=42). A different seed would give somewhat different numbers.
