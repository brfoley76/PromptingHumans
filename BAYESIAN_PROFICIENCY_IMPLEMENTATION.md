# Bayesian Proficiency Tracking Implementation

## Overview

This document describes the implementation of a Bayesian proficiency tracking system for adaptive learning in the Agentic Learning Platform.

## Architecture

### Security-First Design
- **All proficiency data is server-side only**
- No raw Bayesian parameters exposed to frontend
- Students see only scores and unlocks, not detailed proficiency estimates
- Suitable for future teacher/parent dashboards with proper authentication

### Three-Tier Proficiency Tracking

1. **Domain Level** (e.g., "reading", "math")
   - General ability across all modules in a domain
   - Used to personalize new modules in the same domain

2. **Module Level** (e.g., "r003.1")
   - Aggregate proficiency for a specific curriculum module
   - Used for mastery threshold checks (85% fluency)
   - Determines when to advance to next module

3. **Item Level** (e.g., "pirate", "captain", "3x4")
   - Individual item proficiency (vocabulary words, math facts, etc.)
   - Identifies specific strengths and weaknesses
   - Used to focus practice on challenging items

## Mathematical Model

### Beta-Binomial Bayesian Updating

**Prior Distribution:**
- Beta(α₀, β₀) = Beta(2, 2)
- Slightly informed prior centered at 50% ability

**Posterior Update:**
- After n successes and m failures: Beta(α₀+n, β₀+m)
- Mean ability = α / (α + β)
- Confidence increases as α + β increases

**Forgetting Function:**
- Exponential decay toward prior over time
- ability(t) = ability₀ × e^(-λt) + prior × (1 - e^(-λt))
- Default forgetting rate: λ = 0.05 per day

## Implementation Components

### 1. Database Schema

**New Table: `student_proficiencies`**
```sql
CREATE TABLE student_proficiencies (
    proficiency_id VARCHAR PRIMARY KEY,
    student_id VARCHAR NOT NULL,
    level VARCHAR NOT NULL,  -- 'domain', 'module', or 'item'
    domain VARCHAR,
    module_id VARCHAR,
    item_id VARCHAR,
    alpha FLOAT DEFAULT 2.0,
    beta FLOAT DEFAULT 2.0,
    mean_ability FLOAT DEFAULT 0.5,
    confidence FLOAT DEFAULT 0.5,
    learning_rate FLOAT DEFAULT 0.1,
    forgetting_rate FLOAT DEFAULT 0.05,
    sample_count INTEGER DEFAULT 0,
    last_updated DATETIME,
    created_at DATETIME,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);
```

**Indexes for Performance:**
- `idx_student_level_module` on (student_id, level, module_id)
- `idx_student_module_item` on (student_id, module_id, item_id)
- Individual indexes on student_id, level, module_id, item_id

### 2. Bayesian Proficiency Service

**File:** `backend/src/services/bayesian_proficiency.py`

**Key Methods:**

```python
# Initialization
initialize_student_proficiencies(student_id, module_id, domain, items)

# Bayesian Updating
update_proficiencies(student_id, module_id, domain, item_results)

# Adaptive Recommendations (returns actionable data only)
get_adaptive_recommendations(student_id, module_id, activity_type) -> Dict
    Returns: {
        'difficulty': str,
        'num_questions': int,
        'focus_items': List[str],
        'skip_activity': bool
    }

# Mastery Checking
check_mastery_threshold(student_id, module_id, threshold=0.85) -> bool

# Domain Ability (for new module personalization)
get_domain_ability(student_id, domain) -> float
```

### 3. API Integration

**Session Initialization (`POST /session/init`):**
- For new students: Initialize proficiencies for all vocabulary items
- Creates domain, module, and item-level proficiency records

**Activity Start (`POST /activity/start`):**
- Gets Bayesian recommendations for difficulty and question count
- Identifies focus items (items below 70% proficiency)
- Can recommend skipping if mastery detected (>90% ability)
- Returns only actionable parameters, never raw proficiency data

**Activity End (`POST /activity/end`):**
- Records activity attempt
- Updates Bayesian proficiencies with new evidence
- Checks mastery threshold for unlocking next activities
- Returns feedback and recommendations

### 4. Curriculum Enhancement

**Added to vocabulary items in `r003.1.json`:**
```json
{
  "word": "pirate",
  "definition": "...",
  "fitb": "...",
  "difficulty": 0.2,    // 0.0-1.0 scale
  "importance": 1.0     // Weight for module mastery
}
```

**Difficulty Guidelines:**
- 0.0-0.3: Easy (common words: pirate, ship, cat, sea)
- 0.4-0.6: Medium (captain, mast, island, mate)
- 0.7-0.8: Hard (confusing pairs: monkey/money, deck/dock)
- 0.9-1.0: Very Hard (abstract concepts: shape, grog)

## Adaptive Learning Features

### 1. Difficulty Adjustment
- Automatically adjusts difficulty based on proficiency
- Easy: ability < 65%
- Medium: 65% ≤ ability < 80%
- Hard: ability ≥ 80%

### 2. Question Count Adaptation
- High ability + high confidence: 5 questions (quick check)
- Medium ability: 7 questions (moderate practice)
- Low ability or uncertainty: 10 questions (full practice)

### 3. Focus Items
- Identifies up to 5 items below 70% proficiency
- Prioritizes practice on challenging items
- Helps students address specific weaknesses

### 4. Skip Logic
- If module ability ≥ 90%, recommends skipping activity
- Prevents wasting time on mastered content
- Accelerates learning for advanced students

### 5. Mastery Threshold
- Module mastered when ability ≥ 85%
- Requires minimum 10 samples for confidence
- Unlocks next activities/modules

## Default Parameters (Tunable)

```python
DEFAULT_PRIOR_ALPHA = 2.0
DEFAULT_PRIOR_BETA = 2.0
DEFAULT_LEARNING_RATE = 0.1
DEFAULT_FORGETTING_RATE = 0.05  # Per day
MASTERY_THRESHOLD = 0.85
SKIP_THRESHOLD = 0.90
```

These can be tuned based on empirical data:
- Adjust priors based on typical student performance
- Modify learning/forgetting rates based on retention studies
- Fine-tune thresholds based on desired progression speed

## Data Flow

### New Student Flow
```
1. Student creates account
2. System initializes proficiencies:
   - 1 domain-level (reading)
   - 1 module-level (r003.1)
   - 24 item-level (one per vocabulary word)
3. All start with Beta(2, 2) prior
```

### Activity Flow
```
1. Student starts activity
   ↓
2. Backend gets Bayesian recommendations
   - Analyzes current proficiencies
   - Applies forgetting decay
   - Determines difficulty, question count, focus items
   ↓
3. Frontend runs activity with recommendations
   ↓
4. Student completes activity
   ↓
5. Backend updates proficiencies
   - Updates item-level: Beta(α+successes, β+failures)
   - Updates module-level: aggregates item evidence
   - Updates domain-level: aggregates module evidence
   ↓
6. Backend checks mastery threshold
   - If mastered: unlock next activity
   ↓
7. Frontend receives feedback and next steps
```

## Testing Strategy

### Unit Tests
- Bayesian updating math
- Forgetting decay calculations
- Recommendation logic
- Mastery threshold checks

### Integration Tests
- Session initialization with proficiency creation
- Activity start with recommendations
- Activity end with proficiency updates
- Multi-activity progression

### Performance Tests
- Query performance with indexes
- Bulk proficiency initialization
- Concurrent updates

## Future Enhancements

### Short Term
1. Add GET endpoints for teacher/parent dashboards
2. Implement student-specific learning rate tuning
3. Add visualization of proficiency trends

### Medium Term
1. Item Response Theory (IRT) for better difficulty estimation
2. Collaborative filtering for item difficulty
3. Adaptive forgetting rates based on practice frequency

### Long Term
1. Multi-domain proficiency transfer
2. Predictive analytics for intervention
3. Personalized learning path optimization

## Migration

**To apply the database migration:**
```bash
cd backend
alembic upgrade head
```

**To rollback:**
```bash
alembic downgrade -1
```

## Monitoring

**Key Metrics to Track:**
1. Average proficiency by domain/module
2. Time to mastery per module
3. Skip rate (how often students skip activities)
4. Accuracy of difficulty predictions
5. Retention rates (forgetting curve validation)

## Security Considerations

1. **No Frontend Exposure:** Raw proficiency data never sent to frontend
2. **Database Security:** Foreign key constraints prevent orphaned records
3. **Future Authentication:** Ready for role-based access (student/teacher/admin)
4. **Privacy:** Proficiency data tied to student_id, not personally identifiable

## Performance Considerations

1. **Indexes:** Composite indexes for common query patterns
2. **Caching:** Proficiency service uses database connection pooling
3. **Batch Operations:** Bulk create for initialization
4. **Lazy Loading:** Only load proficiencies when needed

## Conclusion

This implementation provides a solid foundation for adaptive learning with:
- ✅ Bayesian proficiency tracking at three levels
- ✅ Adaptive difficulty and question count
- ✅ Focus on challenging items
- ✅ Mastery-based progression
- ✅ Security-first design
- ✅ Scalable architecture
- ✅ Tunable parameters for empirical optimization

The system is production-ready and can be enhanced incrementally based on usage data and educational research.
