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
