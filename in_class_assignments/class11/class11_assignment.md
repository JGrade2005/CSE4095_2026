# Class 11 — Feature Engineering, Feature Selection, and Randomized Search

## Overview

In the previous classes, you learned how to:

- explore and visualize data;
- build classification and regression models;
- preprocess numerical and categorical features;
- evaluate prediction error;
- use cross-validation;
- recognize overfitting;
- compare models fairly;
- manually tune a hyperparameter.

In this assignment, you will extend that workflow by investigating:

**Feature Engineering → Feature Importance → Feature Selection → RandomizedSearchCV**

You will work with a new dataset and a new regression problem.

The central question is no longer simply:

> How do I train a model?

Instead, you will ask:

> How can I improve a modeling workflow systematically without using the final test set to guide my decisions?

---

## Dataset

Use the Auto MPG dataset:

<https://raw.githubusercontent.com/plotly/datasets/master/auto-mpg.csv>

You may load it directly with Pandas.

The target is:

`mpg`

Your goal is to predict a vehicle's fuel economy in miles per gallon.

---

## Part 1 — Load and Understand the Dataset

Load the Auto MPG dataset into a Pandas DataFrame.

Inspect:

- shape;
- first several rows;
- column names;
- data types;
- missing values;
- descriptive statistics.

Create at least one useful visualization of `mpg`.

### Questions

- What does one row represent?
- What is the prediction target?
- Why is this a regression problem?
- Which columns could potentially be useful predictors?
- Which columns contain missing values?

Do not immediately start building models.

First understand the data.

---

## Part 2 — Create the Final Train/Test Split

Create:

- 80% training data
- 20% test data

Use:

`random_state=42`

After creating this split:

**Do not use the test set for feature engineering decisions, feature selection, or hyperparameter tuning.**

The test set should remain untouched until the final evaluation.

### Questions

Explain:

- Why do we create the test set before experimenting?
- Why shouldn't we repeatedly check test MAE while creating features?
- What would happen if we kept modifying the model until the test score improved?

---

## Part 3 — Establish a Baseline

Before feature engineering or hyperparameter tuning, establish a baseline.

### Baseline 1 — Mean Predictor

Create a simple predictor that predicts the training-set mean MPG for every observation.

Evaluate the baseline using appropriate regression metrics such as:

- MAE;
- RMSE;
- $R^2$.

### Baseline 2 — Untuned Random Forest

Build a basic:

`RandomForestRegressor`

using the original numerical features.

Use reasonable default settings and:

`random_state=42`

Evaluate this model using 5-fold cross-validation on the training data.

Use MAE as the primary comparison metric.

### Questions

- What does the mean predictor accomplish?
- How does the untuned Random Forest compare with the simple baseline?
- Why do we need a model baseline before trying to improve the feature set?

---

## Part 4 — Understand Feature Engineering

Feature engineering means creating new features from existing information that may represent useful relationships more directly.

For example, suppose the dataset contains:

`horsepower`

and:

`weight`

A potentially useful engineered feature might be:

$$
\text{power\_to\_weight} = \frac{\text{horsepower}}{\text{weight}}
$$

This may capture information that neither feature represents as directly by itself.

### Important

Do not create random mathematical combinations simply because AI suggests them.

Each engineered feature should have a reasonable interpretation.

---

## Part 5 — Engineer New Features

Create at least three engineered features.

Possible ideas include relationships involving:

- horsepower;
- weight;
- displacement;
- cylinders;
- model year.

You may use AI to suggest candidate features.

However, you must decide which suggestions make sense.

For every engineered feature, include a Markdown explanation containing:

- Feature name
- Formula
- Reasoning

Explain why the feature might contain useful information for predicting MPG.

For example:

> **power_to_weight = horsepower / weight**
>
> This feature represents engine power relative to vehicle weight. Two vehicles with similar horsepower may have different fuel-efficiency behavior if one is much heavier.

Do not evaluate the feature using the final test set.

---

## Part 6 — Evaluate Feature Engineering

Compare:

**Model A**
Random Forest using only the original features.

**Model B**
Random Forest using:

original features + engineered features

Use the same cross-validation procedure for both.

Compare:

- mean CV MAE;
- standard deviation of CV MAE.

Create a table similar to:

| Feature Set | Mean CV MAE | CV Std. |
| --- | --- | --- |
| Original | | |
| Original + Engineered | | |

### Questions

- Did feature engineering improve CV performance?
- Was the improvement large?
- Did all engineered features necessarily help?
- If performance became worse, does that mean the experiment failed?

### Important

Feature engineering does not guarantee better performance.

A useful experiment can show that an idea did not help.

---

## Part 7 — Feature Importance

Train a Random Forest using your engineered feature set.

Investigate the importance of the features.

At minimum, examine:

- Random Forest built-in feature importance;
- permutation importance.

Create a table and/or visualization showing the importance rankings.

---

## Part 8 — Built-In Random Forest Importance

Random Forest provides:

`feature_importances_`

Use it to rank the features.

Create a bar chart showing the results.

### Questions

- Which features appear most important?
- Which appear least important?
- Are any engineered features highly ranked?
- Did any result surprise you?

### Important

Do not automatically conclude:

> Low importance = useless feature.

Feature importance should generate a hypothesis, not automatically make the feature-selection decision.

---

## Part 9 — Permutation Importance

Now calculate permutation importance.

Permutation importance asks:

> How much worse does the model perform when the values of one feature are randomly shuffled?

If shuffling a feature causes performance to deteriorate substantially, the model was relying on that feature.

### Important

Do not calculate permutation importance using the final test set during model development.

Use training/development data.

### Questions

- Which features have the highest permutation importance?
- Which have low permutation importance?
- Does the ranking agree with Random Forest's built-in importance?
- Why might the two importance methods disagree?

---

## Part 10 — Correlated Features and Importance

Suppose two features contain similar information.

For example:

`horsepower`

and an engineered feature based partly on horsepower may be strongly related.

The model may use either feature.

This can cause importance to be divided between them.

### Questions

Explain why:

- A feature can receive low importance even though it contains useful information.

Also explain why feature importance does not imply causation.

---

## Part 11 — Feature Selection

Now use your feature-importance analysis to form a hypothesis about which features might be removable.

Do not simply delete every feature below an arbitrary importance threshold.

Instead, create several candidate feature sets.

For example:

- all features;
- top 8 features;
- top 6 features;
- top 4 features.

Your exact choices may differ depending on your importance results.

Evaluate each feature set using the same 5-fold cross-validation procedure.

Create a table similar to:

| Feature Set | # Features | Mean CV MAE | CV Std. |
| --- | --- | --- | --- |
| All | | | |
| Candidate A | | | |
| Candidate B | | | |
| Candidate C | | | |

### Questions

- Which feature set performs best?
- Can you remove some features without noticeably hurting performance?
- Does the smallest feature set perform best?
- If two feature sets perform almost identically, which would you choose and why?

---

## Part 12 — Why Feature Engineering Comes Before Feature Selection

Explain why we followed:

**Feature Engineering → Feature Importance → Feature Selection**

rather than:

**Feature Selection → Feature Engineering**

Consider this possibility:

A raw feature may have relatively low importance by itself but may be needed to construct a useful engineered feature.

If we remove the raw feature too early, we lose the opportunity to create that feature.

### Question

Explain this idea using one of your own engineered features.

---

## Part 13 — Select Your Feature Set

Based on cross-validation evidence, choose the feature set you will use for hyperparameter tuning.

Explain your decision.

Your explanation should consider:

- CV MAE;
- CV variability;
- number of features;
- simplicity.

Do not use final test performance to make this decision.

---

## Part 14 — Understand Randomized Search

In Class 4, you manually tried several values of:

`max_depth`

That is manageable for one hyperparameter.

Now suppose we want to investigate several Random Forest hyperparameters, such as:

- `n_estimators`
- `max_depth`
- `max_features`
- `min_samples_split`
- `min_samples_leaf`

Trying every possible combination can become expensive.

`RandomizedSearchCV` samples a limited number of combinations from specified distributions or lists and evaluates them using cross-validation.

### Questions

Explain:

- What is a hyperparameter?
- How is a hyperparameter different from a learned model parameter?
- What does RandomizedSearchCV do?
- Why might Randomized Search be preferable to manually trying combinations?
- How is it different from GridSearchCV?

---

## Part 15 — Build a RandomizedSearchCV

Use:

`RandomizedSearchCV`

to tune your Random Forest.

Search over at least four hyperparameters.

Possible choices include:

- `n_estimators`
- `max_depth`
- `max_features`
- `min_samples_split`
- `min_samples_leaf`

Use:

- 5-fold cross-validation;
- MAE-based scoring;
- `random_state=42`.

A reasonable starting point is around 20–30 random combinations.

You may ask AI to suggest reasonable search ranges.

However:

Do not blindly accept extremely large search ranges or hundreds of unnecessary combinations.

You should be able to explain what each hyperparameter controls.

---

## Part 16 — Explain the Hyperparameters

For every hyperparameter included in your search, explain its meaning in your own words.

For example:

- **`n_estimators`** — How many trees are in the forest?
- **`max_depth`** — How deep can each tree grow?
- **`min_samples_split`** — How many observations are required before a node can be split?
- **`min_samples_leaf`** — What is the minimum number of observations allowed in a leaf?
- **`max_features`** — How many features can be considered when looking for a split?

Do not simply copy documentation.

Explain what changing each hyperparameter does to model complexity or behavior.

---

## Part 17 — Examine Randomized Search Results

After running RandomizedSearchCV, report:

- best hyperparameter combination;
- best mean CV MAE.

Also examine several of the highest-ranked combinations.

Create a table containing useful information such as:

| Rank | CV MAE | n_estimators | max_depth | max_features | min_samples_split | min_samples_leaf |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| ... | | | | | | |

### Questions

- Which combination performed best?
- Were several combinations very similar?
- Did any best value occur at the edge of your search range?
- If so, what might that suggest?

Do not automatically run another search merely because a boundary value appeared.

Explain what you would investigate next.

---

## Part 18 — Compare the Modeling Stages

Create a summary table showing the progression of your analysis.

For example:

| Stage | Feature Set / Model | CV MAE |
| --- | --- | --- |
| Baseline RF | Original features | |
| Feature Engineering | Original + engineered | |
| Feature Selection | Selected features | |
| Randomized Search | Selected + tuned RF | |

### Questions

- Which stage produced the largest improvement?
- Did feature engineering help?
- Did feature selection help?
- Did hyperparameter tuning help?
- Was every additional step beneficial?

This table is important because it shows whether the additional complexity was actually useful.

---

## Part 19 — Final Test Evaluation

Only now may you use the held-out test set.

Take the selected feature set and the best model from RandomizedSearchCV.

Evaluate it once on the test set.

Report:

- MAE;
- RMSE;
- $R^2$.

Also compare it with the simple mean baseline.

### Questions

- How does final test performance compare with CV performance?
- Is the result reasonably consistent with what cross-validation suggested?
- Did the final model substantially outperform the mean baseline?
- Is there evidence that your development process overfit the training data?

---

## Part 20 — Actual vs. Predicted MPG

Create a scatter plot showing:

- actual MPG;
- predicted MPG.

Include a diagonal:

actual = predicted

### Questions

- Are predictions generally close to the diagonal?
- Where does the model make larger errors?
- Does the model appear better at predicting some MPG ranges than others?

---

## Part 21 — Residual Analysis

Calculate:

$$
\text{residual} = \text{actual} - \text{predicted}
$$

Create a residual plot.

### Questions

- Do residuals appear randomly distributed around zero?
- Is there an obvious pattern?
- Does the model systematically overpredict or underpredict in any region?

---

## Part 22 — Inspect the Largest Errors

Find the 10 test vehicles with the largest absolute prediction errors.

Display:

- actual MPG;
- predicted MPG;
- residual;
- absolute error;
- relevant original and/or engineered features.

Choose at least two cases and discuss them.

Distinguish between:

**Observation**

and:

**Hypothesis**

Do not claim that a particular feature caused the prediction error.

---

## Part 23 — Design One Additional Experiment

Design one controlled experiment related to this assignment.

Possible ideas include:

- test one additional engineered feature;
- remove a feature you expected to be important;
- compare built-in importance with permutation importance more carefully;
- compare a smaller and larger Randomized Search;
- investigate a different feature-selection subset;
- compare the tuned model with the untuned model.

### Before running it

Write:

> **Hypothesis:** I expect ______ because ______.

Then:

- perform the experiment;
- report the result;
- explain whether the evidence supports your hypothesis.

### Important

Do not use the final test set for this experiment.

Use training data and cross-validation.

---

## Part 24 — AI Reflection

AI assistance is expected.

For this assignment, your reflection should focus on decision making, not simply code generation.

Discuss at least one situation where AI helped you:

- suggest an engineered feature;
- explain feature importance;
- identify candidate features for removal;
- construct RandomizedSearchCV;
- choose search ranges;
- interpret hyperparameter-search results;
- debug code.

Answer:

- What did you ask the AI?
- What did it recommend?
- Did you accept the recommendation?
- Why or why not?
- How did you test the recommendation?
- What evidence supported your final decision?

Also identify one AI suggestion that you rejected or modified.

Explain why.

---

## Part 25 — Final Reflection on the Workflow

At the end of your notebook, explain the complete workflow in your own words:

```
Baseline
   ↓
Feature Engineering
   ↓
Evaluate with Cross-Validation
   ↓
Feature Importance
   ↓
Feature Selection Experiment
   ↓
Select Feature Set
   ↓
RandomizedSearchCV
   ↓
Select Model
   ↓
Final Test Evaluation
```

Answer:

- Why is the order important?

and:

- At which steps should the final test set remain untouched?

---

## Prompting Suggestions

Do not ask:

> Make my model as accurate as possible.

Instead, use prompts that support controlled experiments and reasoning.

### Feature engineering

> I am predicting MPG using horsepower, weight, displacement, cylinders, acceleration, and model year. Suggest five potentially meaningful engineered features. For each one, explain the reasoning. Do not write code yet.

Then decide which suggestions are reasonable.

### Feature importance

> Explain the difference between Random Forest feature_importances_ and permutation importance. Why might they rank correlated features differently?

### Feature selection

> These are my permutation-importance results. I want to test whether some low-ranked features can be removed. Suggest three candidate feature subsets, but do not tell me which one is best. I will compare them using cross-validation.

### Randomized Search

> I am using RandomForestRegressor. Suggest reasonable RandomizedSearchCV ranges for n_estimators, max_depth, max_features, min_samples_split, and min_samples_leaf. Explain why the ranges are reasonable before giving me code.

### Challenge the AI

> My AI assistant says I should delete every feature with low feature importance. Is that necessarily a good idea? Explain what experiment I should perform before removing them.

Or:

> My tuned Random Forest improved CV MAE by only 0.02. Is that enough evidence to say hyperparameter tuning meaningfully improved my model?

These prompts use AI as a reasoning partner, rather than merely a source of code.

---

## What to Submit

Submit one Jupyter/Colab notebook (`.ipynb`).

Your notebook should run from beginning to end and contain:

- dataset inspection;
- final 80/20 train/test split;
- mean baseline;
- untuned Random Forest baseline;
- at least three engineered features;
- CV comparison before and after feature engineering;
- built-in Random Forest feature importance;
- permutation importance;
- feature-selection experiment;
- selected feature set;
- RandomizedSearchCV;
- explanation of searched hyperparameters;
- analysis of search results;
- comparison of modeling stages;
- one final test evaluation;
- actual-vs.-predicted plot;
- residual analysis;
- largest-error analysis;
- one student-designed experiment;
- AI Reflection;
- final workflow reflection.

Use Markdown cells throughout the notebook to explain your decisions and interpret your results.

Also submit a link to your chat with your AI agent.

---

## Important Guidelines

### 1. Do not optimize against the test set.

The test set is not a scoreboard that you repeatedly check while changing your model.

Use:

**training data + cross-validation**

for model development.

Use:

**test data**

once for final evaluation.

### 2. Feature engineering should have reasoning behind it.

Do not create dozens of arbitrary combinations simply because AI can generate them.

### 3. Feature importance is not feature selection.

Use importance to generate hypotheses.

Use cross-validation to test whether removing features is actually helpful.

### 4. More features are not automatically better.

But fewer features are not automatically better either.

Test the question.

### 5. Hyperparameter tuning does not guarantee meaningful improvement.

Compare the tuned model with the untuned model.

### 6. Do not blindly maximize a score.

A difference such as:

CV MAE = 2.41

versus:

CV MAE = 2.39

may not justify a substantially more complicated workflow.

### 7. AI can suggest experiments. Evidence decides.

A useful pattern for agentic data analysis is:

**AI suggestion → hypothesis → controlled experiment → cross-validation → evidence → decision**

You—not the AI—are responsible for the final decision.

---

## The Main Lesson

By this point, you know enough Python and scikit-learn to ask AI to generate a large and complicated machine-learning workflow.

That is not the difficult part.

The difficult part is deciding:

- which features make sense;
- which experiments are valid;
- which comparisons are fair;
- whether an improvement is meaningful;
- whether information is leaking;
- whether the model generalizes;
- and whether the evidence actually supports your conclusion.

The goal of this assignment is therefore not simply to build the best Random Forest.

The goal is to learn how to use an AI coding agent while applying a disciplined machine-learning workflow.
