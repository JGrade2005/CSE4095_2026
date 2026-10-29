What is a Pandas DataFrame?

A Pandas Dataframe is a 2 dimensional, labeled, tabular structure. 

What does one row represent in this dataset?

One row represents A student

What does one column represent?

One column represents an attribute value 

Which columns are numerical?

Columns 1, 2, 3, 4, 7, 8, 9 are numerical

Which columns are categorical?

Columns 5, and 6 are categorical

Which column is an identifier? 

Column 0 is an identifier

Which columns contain missing values?

Columns 1, 2 and 5 are missing values

THREE INTERESTING OBSERVATIONS:

1. The mean for the quiz scores, and the exam scores are very similar. Quiz scores being 77.77, and exam scores being 77.16. This means that overall, the quiz scores tend to give an idea as to what the exam scores will be

2. The std is also very similar for quiz and exam scores. Quiz std = 10.52, exam std = 10.33

3. The minimum hours slept being 4.30 is interesting, and I think that this student getting a higher quiz score than exam score is interesting, and likely due to lack of sleep before the exam compared to the quiz. 

What do you observe from the group comparison?

From the group comparison, I notice that students that study within a study group don't perform noticeably better than those that do not. Those that do study there is only a .56 different in exam scores. This difference is too small to attribute it directly to study groups. Even if the difference was larger, it could be multiple varying factors affecting the exam scores, such as willingness to study, and active retention of information / studying tactics. 

Graph interpretation

1. Histogram

From this graph, I notice that the deviation from the median to 100, has a higher percentage of students than the median to the minimum score. The higher outliers are more prevalent than the low score outliers.

2. Scatter Plot

From this graph, I notice that there is a general positive correlation between study hours per week and exam score. The data is still very spread out, and is not a tight correlation. 

3. sleep vs exam score graph

From this graph, I notice that hours slept each night shows basically no correlation with exam score. Some students that have very little sleep, score similarly to those that sleep a lot each night.

PART 6: 

Prediction: I expect that qui scores to be associated with exam scores because typically, quizzes cover all of the material that is to be on quizzes, so the better a student scores on quizzes, the better they know the information that will be on the exams

It turns out, that quiz score is the best predictor for exam score. The quiz average vs exam average has the tightest spread and correlation. Therefore usually as quiz exam scores improve, so do exam scores. There's of course, always outliers, but the deviation is only 6.61 points on average. The pearson r value, which is the strength of the correlation, is 7.68. This is a large positive correlation.

PART 7:


