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
