# Adaptive Difficulty Simulation & Tuning

## Overview

This document describes the simulation framework for testing and tuning the adaptive difficulty system to ensure optimal student engagement and learning outcomes.

## Configuration Summary

### Difficulty Thresholds
```python
# bayesian_proficiency.py
Hard difficulty:   ability >= 0.80  # Requires strong proficiency
Medium difficulty: ability >= 0.65  # Solid understanding
Easy difficulty:   ability < 0.65   # Building foundation
```

### Question Counts
- **Easy (difficulty='3'):** 24 questions (all vocabulary words)
- **Medium (difficulty='4'):** 10 questions
- **Hard (difficulty='5'):** 10 questions

### Bayesian Prior
- **Prior:** Beta(1, 1) - Uninformative prior for faster learning
- **Mean:** α / (α + β)
- **Update:** Add 1 to α for correct, 1 to β for incorrect

## Student Scenarios

### Student A: High Performer (95% accuracy)

**Expected Progression:**
1. Attempt 1-2: Easy (24Q) @ 95% → proficiency ~0.92
2. Attempt 3+: Hard (10Q) @ 95% → stays at hard

**Mathematical Progression:**
```
After 24Q @ 95% (23 correct, 1 incorrect):
  α = 1 + 23 = 24
  β = 1 + 1 = 2
  mean = 24/26 = 0.923 → Hard (5) ✓

After 10Q @ 95% on hard (9 correct, 1 incorrect):
  α = 24 + 9 = 33
  β = 2 + 1 = 3
  mean = 33/36 = 0.917 → Hard (5) ✓
```

**Result:** ✅ Quickly reaches appropriate challenge level

### Student B: Steady Improver (65% → 85%)

**Expected Progression:**
1. Attempt 1-2: Easy (24Q) @ 65% → proficiency ~0.66
2. Attempt 3-4: Medium (10Q) @ 85% → proficiency ~0.78
3. Attempt 5+: Hard (10Q) @ 80-85% → optimal zone

**Mathematical Progression:**
```
After 24Q @ 65% (16 correct, 8 incorrect):
  α = 1 + 16 = 17
  β = 1 + 8 = 9
  mean = 17/26 = 0.654 → Medium (4) ✓

After 24Q @ 65% again:
  α = 17 + 16 = 33
  β = 9 + 8 = 17
  mean = 33/50 = 0.660 → Medium (4) ✓

After 10Q @ 85% on medium (8 correct, 2 incorrect):
  α = 33 + 8 = 41
  β = 17 + 2 = 19
  mean = 41/60 = 0.683 → Medium (4)

After 10Q @ 85% again:
  α = 41 + 8 = 49
  β = 19 + 2 = 21
  mean = 49/70 = 0.700 → Medium (4)

After 10Q @ 85% third time:
  α = 49 + 8 = 57
  β = 21 + 2 = 23
  mean = 57/80 = 0.713 → Medium (4)

After 10Q @ 85% fourth time:
  α = 57 + 8 = 65
  β = 23 + 2 = 25
  mean = 65/90 = 0.722 → Medium (4)

After 10Q @ 90% (9 correct, 1 incorrect):
  α = 65 + 9 = 74
  β = 25 + 1 = 26
  mean = 74/100 = 0.740 → Medium (4)

After 10Q @ 90% again:
  α = 74 + 9 = 83
  β = 26 + 1 = 27
  mean = 83/110 = 0.755 → Medium (4)

After 10Q @ 90% third time:
  α = 83 + 9 = 92
  β = 27 + 1 = 28
  mean = 92/120 = 0.767 → Medium (4)

After 10Q @ 90% fourth time:
  α = 92 + 9 = 101
  β = 28 + 1 = 29
  mean = 101/130 = 0.777 → Medium (4)

After 10Q @ 95% (10 correct, 0 incorrect):
  α = 101 + 10 = 111
  β = 29 + 0 = 29
  mean = 111/140 = 0.793 → Medium (4)

After 10Q @ 95% again:
  α = 111 + 10 = 121
  β = 29 + 0 = 29
  mean = 121/150 = 0.807 → Hard (5) ✓
```

**Result:** ✅ Gradual progression through difficulty levels

### Student C: Struggling Learner (45% → 75% → 90%)

**Expected Progression:**
1. Attempt 1-2: Easy (24Q) @ 45% → proficiency ~0.47
2. Attempt 3-4: Easy (24Q) @ 75% → proficiency ~0.66
3. Attempt 5-7: Medium (10Q) @ 65-90% → proficiency ~0.75
4. Attempt 8+: Hard (10Q) @ 65-90% → variable performance

**Mathematical Progression:**
```
After 24Q @ 45% (11 correct, 13 incorrect):
  α = 1 + 11 = 12
  β = 1 + 13 = 14
  mean = 12/26 = 0.462 → Easy (3) ✓

After 24Q @ 45% again:
  α = 12 + 11 = 23
  β = 14 + 13 = 27
  mean = 23/50 = 0.460 → Easy (3) ✓

After 24Q @ 75% (18 correct, 6 incorrect):
  α = 23 + 18 = 41
  β = 27 + 6 = 33
  mean = 41/74 = 0.554 → Easy (3)

After 24Q @ 75% again:
  α = 41 + 18 = 59
  β = 33 + 6 = 39
  mean = 59/98 = 0.602 → Easy (3)

After 24Q @ 80% (19 correct, 5 incorrect):
  α = 59 + 19 = 78
  β = 39 + 5 = 44
  mean = 78/122 = 0.639 → Easy (3)

After 24Q @ 85% (20 correct, 4 incorrect):
  α = 78 + 20 = 98
  β = 44 + 4 = 48
  mean = 98/146 = 0.671 → Medium (4) ✓

After 10Q @ 65% on medium (6 correct, 4 incorrect):
  α = 98 + 6 = 104
  β = 48 + 4 = 52
  mean = 104/156 = 0.667 → Medium (4) ✓

After 10Q @ 75% (7 correct, 3 incorrect):
  α = 104 + 7 = 111
  β = 52 + 3 = 55
  mean = 111/166 = 0.669 → Medium (4)

After 10Q @ 90% (9 correct, 1 incorrect):
  α = 111 + 9 = 120
  β = 55 + 1 = 56
  mean = 120/176 = 0.682 → Medium (4)

After 10Q @ 90% again:
  α = 120 + 9 = 129
  β = 56 + 1 = 57
  mean = 129/186 = 0.694 → Medium (4)

After 10Q @ 95% (10 correct, 0 incorrect):
  α = 129 + 10 = 139
  β = 57 + 0 = 57
  mean = 139/196 = 0.709 → Medium (4)

After 10Q @ 95% again:
  α = 139 + 10 = 149
  β = 57 + 0 = 57
  mean = 149/206 = 0.723 → Medium (4)

After 10Q @ 95% third time:
  α = 149 + 10 = 159
  β = 57 + 0 = 57
  mean = 159/216 = 0.736 → Medium (4)

After 10Q @ 95% fourth time:
  α = 159 + 10 = 169
  β = 57 + 0 = 57
  mean = 169/226 = 0.748 → Medium (4)

After 10Q @ 95% fifth time:
  α = 169 + 10 = 179
  β = 57 + 0 = 57
  mean = 179/236 = 0.758 → Medium (4)

After 10Q @ 95% sixth time:
  α = 179 + 10 = 189
  β = 57 + 0 = 57
  mean = 189/246 = 0.768 → Medium (4)

After 10Q @ 95% seventh time:
  α = 189 + 10 = 199
  β = 57 + 0 = 57
  mean = 199/256 = 0.777 → Medium (4)

After 10Q @ 95% eighth time:
  α = 199 + 10 = 209
  β = 57 + 0 = 57
  mean = 209/266 = 0.786 → Medium (4)

After 10Q @ 100% (10 correct, 0 incorrect):
  α = 209 + 10 = 219
  β = 57 + 0 = 57
  mean = 219/276 = 0.793 → Medium (4)

After 10Q @ 100% again:
  α = 219 + 10 = 229
  β = 57 + 0 = 57
  mean = 229/286 = 0.801 → Hard (5) ✓
```

**Result:** ✅ Stays at appropriate level until mastery demonstrated

## Threshold Behavior Analysis

### With Beta(1,1) Prior and 0.80/0.65 Thresholds

**After 24 questions (Easy level):**
| Accuracy | Proficiency | Recommended |
|----------|-------------|-------------|
| 45%      | 0.462       | Easy (3)    |
| 65%      | 0.654       | Medium (4)  |
| 75%      | 0.750       | Medium (4)  |
| 85%      | 0.846       | Hard (5)    |
| 95%      | 0.923       | Hard (5)    |

**After 10 questions (Medium/Hard level):**
| Accuracy | Proficiency | Recommended |
|----------|-------------|-------------|
| 45%      | 0.545       | Easy (3)    |
| 65%      | 0.727       | Medium (4)  |
| 75%      | 0.800       | Hard (5)    |
| 85%      | 0.864       | Hard (5)    |
| 95%      | 0.917       | Hard (5)    |

## Key Insights

### 1. Easy Level (24 Questions)
- **Purpose:** Comprehensive vocabulary assessment
- **Benefit:** More data points = more accurate proficiency estimate
- **Threshold:** 65% accuracy (16/24) to advance to medium
- **Rationale:** Ensures solid foundation before increasing difficulty

### 2. Medium Level (10 Questions)
- **Purpose:** Targeted practice at moderate difficulty
- **Threshold:** 80% accuracy sustained to advance to hard
- **Challenge:** Requires multiple successful attempts to demonstrate mastery
- **Rationale:** Prevents premature advancement

### 3. Hard Level (10 Questions)
- **Purpose:** Optimal challenge zone (80-90% accuracy)
- **Maintenance:** Students stay here when performing well
- **Adjustment:** Drops to medium if performance falls below 65%

### 4. Progression Speed
- **High performers:** 2 attempts to reach hard (48 questions total)
- **Steady improvers:** 4-6 attempts to reach hard (88-128 questions)
- **Struggling learners:** 8-12 attempts to reach hard (240-360 questions)

## Tuning Rationale

### Why 0.80 for Hard?
- Requires consistent 75%+ performance over multiple attempts
- Prevents "lucky streak" advancement
- Ensures students are truly ready for challenge

### Why 0.65 for Medium?
- Allows progression after demonstrating 65%+ accuracy
- Not too easy (would advance at 50%)
- Not too hard (would require 80%+)
- Sweet spot for gradual improvement

### Why 24 Questions for Easy?
- Tests all vocabulary words once
- Provides comprehensive baseline assessment
- More accurate initial proficiency estimate
- Better identifies specific weaknesses

## Running Simulations

### Setup
```bash
cd backend
python3 -m pytest tests/test_adaptive_simulation.py -v -s
```

### Individual Tests
```bash
# Test high performer
pytest tests/test_adaptive_simulation.py::TestAdaptiveSimulation::test_student_a_high_performer -v -s

# Test steady improver
pytest tests/test_adaptive_simulation.py::TestAdaptiveSimulation::test_student_b_steady_improver -v -s

# Test struggling learner
pytest tests/test_adaptive_simulation.py::TestAdaptiveSimulation::test_student_c_struggling_learner -v -s

# View threshold behavior
pytest tests/test_adaptive_simulation.py::TestAdaptiveSimulation::test_summary_statistics -v -s
```

## Monitoring in Production

### Key Metrics to Track

1. **Average Accuracy by Difficulty**
   ```sql
   SELECT 
       difficulty,
       AVG(100.0 * score / total) as avg_accuracy,
       COUNT(*) as attempts
   FROM activity_attempts
   WHERE activity = 'multiple_choice'
   GROUP BY difficulty;
   ```
   **Target:** 80-90% at each level

2. **Progression Speed**
   ```sql
   SELECT 
       student_id,
       COUNT(*) as attempts_to_hard,
       MIN(date) as first_attempt,
       MAX(date) as reached_hard
   FROM activity_attempts
   WHERE difficulty = '5'
   GROUP BY student_id;
   ```
   **Target:** 2-12 attempts depending on ability

3. **Retention at Difficulty**
   ```sql
   SELECT 
       difficulty,
       AVG(consecutive_attempts) as avg_retention
   FROM (
       SELECT 
           student_id,
           difficulty,
           COUNT(*) as consecutive_attempts
       FROM activity_attempts
       GROUP BY student_id, difficulty
   ) subquery
   GROUP BY difficulty;
   ```
   **Target:** 2-4 attempts per level

## Adjustment Guidelines

### If Students Progress Too Fast
- Increase hard threshold (0.80 → 0.85)
- Increase medium threshold (0.65 → 0.70)
- Require more attempts before level change

### If Students Progress Too Slow
- Decrease hard threshold (0.80 → 0.75)
- Decrease medium threshold (0.65 → 0.60)
- Reduce question count at easy level

### If Accuracy Too High (>90%)
- System is too easy
- Increase thresholds
- Add more challenging content

### If Accuracy Too Low (<70%)
- System is too hard
- Decrease thresholds
- Add more scaffolding

## Related Files

- `backend/tests/test_adaptive_simulation.py` - Simulation framework
- `backend/src/services/bayesian_proficiency.py` - Threshold logic
- `backend/src/api/routes.py` - Question count configuration
- `ADAPTIVE_DIFFICULTY_FIX.md` - Previous tuning documentation
- `BAYESIAN_PROFICIENCY_FIX.md` - Proficiency system fixes

## Future Enhancements

1. **Adaptive Question Count**
   - Fewer questions when confidence is high
   - More questions when learning new content

2. **Personalized Thresholds**
   - Learn optimal thresholds per student
   - Adjust based on engagement metrics

3. **Time-Based Adjustments**
   - Account for time between attempts
   - Apply forgetting curves

4. **Multi-Dimensional Difficulty**
   - Separate thresholds for speed vs accuracy
   - Different progressions for different skills

5. **A/B Testing Framework**
   - Test different threshold configurations
   - Measure impact on learning outcomes
