# Bayesian Proficiency with Optional/Bonus Activities

## Overview

This document describes the enhanced Bayesian proficiency tracking system with support for optional/bonus activities that can be skipped when mastered.

## Key Changes from Base Implementation

### 1. Optional Activities Flag

**Curriculum Enhancement:**
```json
{
  "exercises": ["multiple_choice", "fill_in_the_blank", "spelling", "bubble_pop", "fluent_reading"],
  "optional_exercises": ["bubble_pop"]
}
```

- Activities listed in `optional_exercises` can be skipped if student has mastered the content
- Required activities must always be completed at hardest difficulty to unlock next activity

### 2. Skip Logic Rules

**Required Activities (e.g., multiple_choice, spelling):**
- Student MUST complete at hardest difficulty with 80%+ accuracy
- Bayesian system adapts starting difficulty and question count
- No skip option, even with 90%+ proficiency
- Ensures every student demonstrates mastery of core content

**Optional Activities (e.g., bubble_pop):**
- If proficiency ≥ 90% AND activity is marked optional: Offer skip
- Student can choose to skip OR practice anyway
- Skipping doesn't affect unlocking next required activity
- Great for providing extra practice to struggling students without blocking advanced students

### 3. Child-Friendly UI Design

**Activity Panel Display:**

Each activity shows:
- 🎯 **Icon** - Colorful, themed emoji
- ⭐⭐⭐ **Score** - Stars + percentage (0-60%: 1 star, 60-80%: 2 stars, 80-100%: 3 stars)
- 🏆 **Level Badge** - Learning (easy), Growing (medium), Champion (hard)
- 🎁 **BONUS Badge** - For optional activities when mastered

**Difficulty Labels (Kid-Friendly):**
- Easy → 🌱 "Learning" (green)
- Medium → 💪 "Growing" (yellow)  
- Hard → 🏆 "Champion" (gold)
- Mastered → ⭐ "Master" (rainbow/sparkle)

**Activity States:**
- **Locked** 🔒 - Grayed out with lock icon
- **Unlocked (New)** - Full color with "NEW!" badge
- **In Progress** - Shows current score and level
- **Bonus (Mastered)** - Shows 🎁 BONUS badge with sparkle effect

### 4. Backend API Changes

**BayesianProficiencyService.get_adaptive_recommendations():**
```python
def get_adaptive_recommendations(
    student_id: str,
    module_id: str,
    activity_type: str,
    is_optional: bool = False  # NEW parameter
) -> Dict:
    # ... existing code ...
    
    # Check if should offer skip (only for optional activities)
    if is_optional and module_ability >= SKIP_THRESHOLD:
        return {
            'difficulty': 'skip',
            'num_questions': 0,
            'focus_items': [],
            'skip_activity': True,
            'skip_reason': "You've mastered this content! This is a bonus activity - skip or play for fun."
        }
```

**Activity Start Endpoint:**
```python
# Check if activity is optional
curriculum = CurriculumService.load_curriculum(session.module_id)
optional_exercises = curriculum.get('optional_exercises', [])
is_optional = request.activity_type in optional_exercises

# Get recommendations with optional flag
recommendations = BayesianProficiencyService.get_adaptive_recommendations(
    session.student_id,
    session.module_id,
    request.activity_type,
    is_optional=is_optional
)

# If skip recommended for optional activity
if recommendations.get('skip_activity', False):
    return ActivityStartResponse(
        activity_type=request.activity_type,
        recommended_tuning={
            'difficulty': 'skip',
            'skip': True,
            'is_optional': True
        },
        agent_intro=recommendations.get('skip_reason'),
        vocabulary_focus=[]
    )
```

**Helper Functions Added:**
```python
def _get_activity_display_name(activity_type: str) -> str:
    """Get child-friendly display name for activity"""
    names = {
        'multiple_choice': 'Word Quiz',
        'fill_in_the_blank': 'Fill It In',
        'spelling': 'Spell It',
        'bubble_pop': 'Bubble Fun',
        'fluent_reading': 'Read It'
    }
    return names.get(activity_type, activity_type.replace('_', ' ').title())

def _get_activity_icon(activity_type: str) -> str:
    """Get emoji icon for activity"""
    icons = {
        'multiple_choice': '🎯',
        'fill_in_the_blank': '✏️',
        'spelling': '🔤',
        'bubble_pop': '🫧',
        'fluent_reading': '📖'
    }
    return icons.get(activity_type, '📝')
```

### 5. User Experience Examples

**Scenario 1: Required Activity - High Proficiency**
- Student: 95% proficiency in reading
- Activity: multiple_choice (required)
- System: "Start at difficulty 5 with 5 questions"
- Result: Efficient but still required - completes quickly, unlocks next activity ✓

**Scenario 2: Optional Activity - High Proficiency**
- Student: 92% proficiency in reading
- Activity: bubble_pop (optional)
- System: "🎁 BONUS Activity! You've mastered this! Skip or play for fun?"
- Options:
  - [Skip] → Moves to next activity ✓
  - [Play Anyway] → Gets 5 hard questions for fun ✓

**Scenario 3: Optional Activity - Low Proficiency**
- Student: 45% proficiency in reading
- Activity: bubble_pop (optional)
- System: "🎁 BONUS Practice! This will help you get even better! 💪"
- Result: Gets 10 easy questions for extra practice ✓
- Benefit: Builds confidence and speed without blocking progression

**Scenario 4: Required Activity - Low Proficiency**
- Student: 40% proficiency
- Activity: spelling (required)
- System: "Start at easy difficulty with 10 questions"
- Result: Practices until mastery improves
- Must eventually complete at hard difficulty with 80%+ to unlock next activity

### 6. Frontend Implementation Notes

**Detecting Skip Option:**
```javascript
if (response.recommended_tuning.skip && response.recommended_tuning.is_optional) {
    // Show modal or dialog
    showBonusActivityDialog({
        title: "🎁 BONUS Activity!",
        message: response.agent_intro,
        buttons: [
            { text: "Skip", action: () => skipActivity() },
            { text: "Play Anyway", action: () => startActivity() }
        ]
    });
} else {
    // Normal activity start
    startActivity();
}
```

**Activity Panel Rendering:**
```javascript
function renderActivityCard(activity) {
    const card = {
        icon: activity.icon,
        name: activity.name,
        locked: !activity.unlocked,
        score: activity.best_score,
        stars: getStarCount(activity.best_score),
        level: getDifficultyBadge(activity.current_difficulty),
        bonus: activity.bonus  // Show 🎁 badge if true
    };
    
    return createCardElement(card);
}

function getDifficultyBadge(difficulty) {
    const badges = {
        'easy': '🌱 Learning',
        'medium': '💪 Growing',
        'hard': '🏆 Champion'
    };
    return badges[difficulty] || '';
}

function getStarCount(score) {
    if (score >= 80) return 3;
    if (score >= 60) return 2;
    return 1;
}
```

### 7. Benefits of This Approach

✅ **Flexible Curriculum Design** - Easy to mark activities as optional
✅ **Efficient for Advanced Students** - Skip mastered bonus content
✅ **Supportive for Struggling Students** - Extra practice without blocking
✅ **Clear Expectations** - Required vs optional is explicit
✅ **Motivating** - "Bonus" feels like a reward, not a skip
✅ **Child-Friendly** - Simple, colorful, encouraging UI
✅ **Maintains Standards** - All students prove mastery of required content

### 8. Configuration

**To mark an activity as optional:**
1. Edit curriculum JSON (e.g., `web/data/r003.1.json`)
2. Add activity type to `optional_exercises` array
3. No code changes needed - system automatically detects

**Example:**
```json
{
  "exercises": ["multiple_choice", "fill_in_the_blank", "spelling", "bubble_pop", "fluent_reading"],
  "optional_exercises": ["bubble_pop"]
}
```

### 9. Testing Considerations

**Test Cases:**
1. Required activity with high proficiency - should NOT offer skip
2. Optional activity with high proficiency (>90%) - should offer skip
3. Optional activity with medium proficiency - should NOT offer skip
4. Skip option only appears when both conditions met: optional AND mastered
5. Skipping optional activity doesn't affect required activity unlocks
6. Playing optional activity anyway still records results and updates proficiency

### 10. Future Enhancements

**Short Term:**
- Add "times skipped" counter for analytics
- Track which students use bonus activities vs skip them
- A/B test different skip threshold values (85% vs 90% vs 95%)

**Medium Term:**
- Allow curriculum designers to set custom skip thresholds per activity
- Add "challenge mode" for optional activities (harder than normal hard)
- Gamification: Badges for completing all bonus activities

**Long Term:**
- Adaptive bonus activity recommendations based on learning style
- Personalized bonus activity difficulty based on student preferences
- Social features: Share bonus activity high scores with classmates

## Summary

The optional/bonus activity feature provides:
- **Flexibility** for curriculum designers
- **Efficiency** for advanced students
- **Support** for struggling students
- **Motivation** through positive framing ("bonus" not "skip")
- **Standards** by requiring core content completion
- **Child-friendly** UI that's simple and encouraging

All while maintaining the robust Bayesian proficiency tracking that adapts to each student's learning journey.
