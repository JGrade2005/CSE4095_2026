# Class 11 Requirements Checklist

## General requirements

- [ ] Use Auto MPG dataset from https://raw.githubusercontent.com/plotly/datasets/master/auto-mpg.csv
- [ ] Prediction target is `mpg`
- [ ] Do not optimize against the test set
- [ ] Use training data + cross-validation for model development
- [ ] Use test data once for final evaluation
- [ ] Feature engineering should have reasoning behind it
- [ ] Feature importance generates hypotheses; cross-validation tests them
- [ ] More features are not automatically better; test the question
- [ ] Hyperparameter tuning does not guarantee meaningful improvement
- [ ] AI suggestion → hypothesis → controlled experiment → cross-validation → evidence → decision

## Part 1 — Load and Understand the Dataset

- [ ] Code: Load the Auto MPG dataset into a Pandas DataFrame
- [ ] Code: Inspect shape, first several rows, column names, data types, missing values, descriptive statistics
- [ ] Plot: Create at least one useful visualization of `mpg`
- [ ] Q: "What does one row represent?"
- [ ] Q: "What is the prediction target?"
- [ ] Q: "Why is this a regression problem?"
- [ ] Q: "Which columns could potentially be useful predictors?"
- [ ] Q: "Which columns contain missing values?"

## Part 2 — Create the Final Train/Test Split

- [ ] Code: Create 80% training data and 20% test data with random_state=42
- [ ] Rule: "Do not use the test set for feature engineering decisions, feature selection, or hyperparameter tuning."
- [ ] Q: "Explain:" (applies to the three questions below)
- [ ] Q: "Why do we create the test set before experimenting?"
- [ ] Q: "Why shouldn't we repeatedly check test MAE while creating features?"
- [ ] Q: "What would happen if we kept modifying the model until the test score improved?"

## Part 3 — Establish a Baseline

- [ ] Code: Create simple predictor that predicts the training-set mean MPG
- [ ] Code: Evaluate baseline using MAE, RMSE, and R²
- [ ] Code: Build untuned RandomForestRegressor using original numerical features, reasonable default settings, random_state=42
- [ ] Code: Evaluate untuned Random Forest using 5-fold cross-validation with MAE as primary metric
- [ ] Q: "What does the mean predictor accomplish?"
- [ ] Q: "How does the untuned Random Forest compare with the simple baseline?"
- [ ] Q: "Why do we need a model baseline before trying to improve the feature set?"

## Part 4 — Understand Feature Engineering

- [ ] Markdown: Explain feature engineering (example: power_to_weight = horsepower / weight)
- [ ] Rule: "Do not create random mathematical combinations simply because AI suggests them." "Each engineered feature should have a reasonable interpretation."

## Part 5 — Engineer New Features

- [ ] Code: Create at least three engineered features
- [ ] Markdown: For every engineered feature: Feature name, Formula, Reasoning
- [ ] Markdown: "Explain why the feature might contain useful information for predicting MPG."
- [ ] Gate: user decides which AI-suggested features make sense
- [ ] Rule: "Do not evaluate the feature using the final test set."

## Part 6 — Evaluate Feature Engineering

- [ ] Code: Compare Model A (Random Forest with original features) vs Model B (Random Forest with original + engineered features) using same cross-validation procedure
- [ ] Code: Compare mean CV MAE and standard deviation of CV MAE
- [ ] Table: Feature Set, Mean CV MAE, CV Std. for Original and Original + Engineered
- [ ] Q: "Did feature engineering improve CV performance?"
- [ ] Q: "Was the improvement large?"
- [ ] Q: "Did all engineered features necessarily help?"
- [ ] Q: "If performance became worse, does that mean the experiment failed?"

## Part 7 — Feature Importance

- [ ] Code: Train Random Forest using engineered feature set
- [ ] Code: Examine Random Forest built-in feature importance
- [ ] Code: Examine permutation importance
- [ ] Table: Importance rankings showing at minimum built-in and permutation importance
- [ ] Plot: Visualization showing importance rankings

## Part 8 — Built-In Random Forest Importance

- [ ] Code: Use feature_importances_ to rank the features
- [ ] Plot: Bar chart showing feature importance results
- [ ] Q: "Which features appear most important?"
- [ ] Q: "Which appear least important?"
- [ ] Q: "Are any engineered features highly ranked?"
- [ ] Q: "Did any result surprise you?"

## Part 9 — Permutation Importance

- [ ] Code: Calculate permutation importance
- [ ] Rule: "Do not calculate permutation importance using the final test set during model development." "Use training/development data."
- [ ] Q: "Which features have the highest permutation importance?"
- [ ] Q: "Which have low permutation importance?"
- [ ] Q: "Does the ranking agree with Random Forest's built-in importance?"
- [ ] Q: "Why might the two importance methods disagree?"

## Part 10 — Correlated Features and Importance

- [ ] Q: "Explain why:" "A feature can receive low importance even though it contains useful information."
- [ ] Q: "Also explain why feature importance does not imply causation."

## Part 11 — Feature Selection

- [ ] Code: Create several candidate feature sets based on importance analysis (e.g., all features, top 8, top 6, top 4)
- [ ] Gate: user chooses candidate subsets
- [ ] Rule: "Do not simply delete every feature below an arbitrary importance threshold."
- [ ] Code: Evaluate each feature set using 5-fold cross-validation procedure
- [ ] Table: Feature Set, # Features, Mean CV MAE, CV Std. for all candidates
- [ ] Q: "Which feature set performs best?"
- [ ] Q: "Can you remove some features without noticeably hurting performance?"
- [ ] Q: "Does the smallest feature set perform best?"
- [ ] Q: "If two feature sets perform almost identically, which would you choose and why?"

## Part 12 — Why Feature Engineering Comes Before Feature Selection

- [ ] Q: "Explain why we followed: Feature Engineering → Feature Importance → Feature Selection rather than: Feature Selection → Feature Engineering"
- [ ] Q: "Explain this idea using one of your own engineered features."

## Part 13 — Select Your Feature Set

- [ ] Gate: "Based on cross-validation evidence, choose the feature set you will use for hyperparameter tuning."
- [ ] Q: "Explain your decision." (consider CV MAE; CV variability; number of features; simplicity)
- [ ] Rule: "Do not use final test performance to make this decision."

## Part 14 — Understand Randomized Search

- [ ] Q: "Explain:" (applies to the five questions below)
- [ ] Q: "What is a hyperparameter?"
- [ ] Q: "How is a hyperparameter different from a learned model parameter?"
- [ ] Q: "What does RandomizedSearchCV do?"
- [ ] Q: "Why might Randomized Search be preferable to manually trying combinations?"
- [ ] Q: "How is it different from GridSearchCV?"

## Part 15 — Build a RandomizedSearchCV

- [ ] Code: Use RandomizedSearchCV with at least four hyperparameters
- [ ] Code: Use 5-fold cross-validation, MAE-based scoring, random_state=42, around 20-30 random combinations
- [ ] Gate: user chooses search ranges
- [ ] Rule: "Do not blindly accept extremely large search ranges or hundreds of unnecessary combinations."

## Part 16 — Explain the Hyperparameters

- [ ] Q: "For every hyperparameter included in your search, explain its meaning in your own words."
- [ ] Q: "Explain what changing each hyperparameter does to model complexity or behavior."
- [ ] Rule: "Do not simply copy documentation."

## Part 17 — Examine Randomized Search Results

- [ ] Code: Report best hyperparameter combination and best mean CV MAE
- [ ] Code: Examine several of the highest-ranked combinations
- [ ] Table: Rank, CV MAE, and all searched hyperparameters for top results
- [ ] Q: "Which combination performed best?"
- [ ] Q: "Were several combinations very similar?"
- [ ] Q: "Did any best value occur at the edge of your search range?"
- [ ] Q: "If so, what might that suggest?"
- [ ] Q: "Explain what you would investigate next."
- [ ] Rule: "Do not automatically run another search merely because a boundary value appeared."

## Part 18 — Compare the Modeling Stages

- [ ] Table: Stage, Feature Set / Model, CV MAE showing progression from Baseline RF through Randomized Search
- [ ] Q: "Which stage produced the largest improvement?"
- [ ] Q: "Did feature engineering help?"
- [ ] Q: "Did feature selection help?"
- [ ] Q: "Did hyperparameter tuning help?"
- [ ] Q: "Was every additional step beneficial?"

## Part 19 — Final Test Evaluation

- [ ] Gate: user types exactly UNLOCK TEST SET
- [ ] Code: Evaluate selected feature set and best model from RandomizedSearchCV on test set, once
- [ ] Code: Report MAE, RMSE, and R²
- [ ] Code: Compare with simple mean baseline
- [ ] Q: "How does final test performance compare with CV performance?"
- [ ] Q: "Is the result reasonably consistent with what cross-validation suggested?"
- [ ] Q: "Did the final model substantially outperform the mean baseline?"
- [ ] Q: "Is there evidence that your development process overfit the training data?"

## Part 20 — Actual vs. Predicted MPG

- [ ] Plot: Scatter plot showing actual MPG and predicted MPG with diagonal (actual = predicted)
- [ ] Q: "Are predictions generally close to the diagonal?"
- [ ] Q: "Where does the model make larger errors?"
- [ ] Q: "Does the model appear better at predicting some MPG ranges than others?"

## Part 21 — Residual Analysis

- [ ] Code: Calculate residuals as actual - predicted
- [ ] Plot: Residual plot
- [ ] Q: "Do residuals appear randomly distributed around zero?"
- [ ] Q: "Is there an obvious pattern?"
- [ ] Q: "Does the model systematically overpredict or underpredict in any region?"

## Part 22 — Inspect the Largest Errors

- [ ] Code: Find 10 test vehicles with largest absolute prediction errors
- [ ] Table: Display actual MPG, predicted MPG, residual, absolute error, and relevant original/engineered features
- [ ] Q: "Choose at least two cases and discuss them." Distinguish between **Observation** and **Hypothesis**
- [ ] Rule: "Do not claim that a particular feature caused the prediction error."

## Part 23 — Design One Additional Experiment

- [ ] Gate: user designs one controlled experiment and writes the hypothesis
- [ ] Markdown (before running): "**Hypothesis:** I expect ______ because ______."
- [ ] Code: Perform the experiment
- [ ] Q: report the result; "explain whether the evidence supports your hypothesis."
- [ ] Rule: "Do not use the final test set for this experiment." "Use training data and cross-validation."

## Part 24 — AI Reflection

- [ ] Q: "Discuss at least one situation where AI helped you" (suggest an engineered feature; explain feature importance; identify candidate features for removal; construct RandomizedSearchCV; choose search ranges; interpret hyperparameter-search results; debug code)
- [ ] Q: "What did you ask the AI?"
- [ ] Q: "What did it recommend?"
- [ ] Q: "Did you accept the recommendation?"
- [ ] Q: "Why or why not?"
- [ ] Q: "How did you test the recommendation?"
- [ ] Q: "What evidence supported your final decision?"
- [ ] Q: "Also identify one AI suggestion that you rejected or modified." "Explain why."

## Part 25 — Final Reflection on the Workflow

- [ ] Q: "At the end of your notebook, explain the complete workflow in your own words:" (Baseline → Feature Engineering → Evaluate with Cross-Validation → Feature Importance → Feature Selection Experiment → Select Feature Set → RandomizedSearchCV → Select Model → Final Test Evaluation)
- [ ] Q: "Why is the order important?"
- [ ] Q: "At which steps should the final test set remain untouched?"

## What to Submit

- [ ] One Jupyter/Colab notebook (`.ipynb`) that runs from beginning to end
- [ ] Dataset inspection in notebook
- [ ] Final 80/20 train/test split in notebook
- [ ] Mean baseline in notebook
- [ ] Untuned Random Forest baseline in notebook
- [ ] At least three engineered features in notebook
- [ ] CV comparison before and after feature engineering in notebook
- [ ] Built-in Random Forest feature importance in notebook
- [ ] Permutation importance in notebook
- [ ] Feature-selection experiment in notebook
- [ ] Selected feature set in notebook
- [ ] RandomizedSearchCV in notebook
- [ ] Explanation of searched hyperparameters in notebook
- [ ] Analysis of search results in notebook
- [ ] Comparison of modeling stages in notebook
- [ ] One final test evaluation in notebook
- [ ] Actual-vs.-predicted plot in notebook
- [ ] Residual analysis in notebook
- [ ] Largest-error analysis in notebook
- [ ] One student-designed experiment in notebook
- [ ] AI Reflection in notebook
- [ ] Final workflow reflection in notebook
- [ ] Markdown cells throughout notebook explaining decisions and interpreting results
- [ ] Link to chat with AI agent
