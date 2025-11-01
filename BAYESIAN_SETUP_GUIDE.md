# Bayesian Proficiency System - Setup Guide

## Prerequisites

The backend requires Python 3.9+ and the following packages to be installed:
- alembic (for database migrations)
- pytest (for running tests)
- All packages listed in `backend/requirements.txt`

## Installation Steps

### 1. Set Up Python Virtual Environment (Recommended)

```bash
cd ../prompting_human_agent/backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows
```

### 2. Install Dependencies

```bash
# Install all required packages
pip install -r requirements.txt

# Verify alembic is installed
alembic --version

# Verify pytest is installed
pytest --version
```

### 3. Apply Database Migration

The migration creates the `student_proficiencies` table with all necessary indexes.

```bash
# From backend directory
alembic upgrade head
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002, Add Bayesian proficiency tracking
```

**To verify migration:**
```bash
# Check current revision
alembic current

# Should show: 002 (head)
```

### 4. Run Unit Tests

```bash
# Run all Bayesian proficiency tests
pytest tests/test_bayesian_proficiency.py -v

# Run with detailed output
pytest tests/test_bayesian_proficiency.py -v --tb=short

# Run specific test class
pytest tests/test_bayesian_proficiency.py::TestBayesianUpdating -v
```

**Expected Output:**
```
tests/test_bayesian_proficiency.py::TestBayesianUpdating::test_prior_initialization PASSED
tests/test_bayesian_proficiency.py::TestBayesianUpdating::test_bayesian_update_all_correct PASSED
tests/test_bayesian_proficiency.py::TestBayesianUpdating::test_bayesian_update_all_incorrect PASSED
...
======================== X passed in Y.YYs ========================
```

### 5. Start the Backend Server

```bash
# From backend directory
python3 -m src.main

# Or with uvicorn directly
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Verification Steps

### 1. Test Database Schema

```bash
# Open SQLite database
sqlite3 learning.db

# Check if student_proficiencies table exists
.tables

# Should show: student_proficiencies (among other tables)

# View table schema
.schema student_proficiencies

# Exit
.quit
```

### 2. Test API Endpoints

```bash
# Test session initialization (creates proficiencies for new student)
curl -X POST http://localhost:8000/session/init \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "module_id": "r003.1"}'

# Should return session data with student_id

# Test activity start (gets Bayesian recommendations)
curl -X POST http://localhost:8000/activity/start \
  -H "Content-Type: application/json" \
  -d '{"session_id": "SESSION_ID_FROM_ABOVE", "activity_type": "multiple_choice"}'

# Should return adaptive recommendations
```

### 3. Verify Proficiency Initialization

```bash
# Query database to see proficiencies
sqlite3 learning.db "SELECT level, domain, module_id, item_id, mean_ability FROM student_proficiencies WHERE student_id='STUDENT_ID' LIMIT 10;"

# Should show:
# - 1 domain-level proficiency (reading)
# - 1 module-level proficiency (r003.1)
# - 24 item-level proficiencies (one per vocabulary word)
```

## Troubleshooting

### Issue: "alembic: command not found"

**Solution:** Install alembic in your environment
```bash
pip install alembic
```

### Issue: "pytest: command not found"

**Solution:** Install pytest
```bash
pip install pytest
```

### Issue: "No module named 'src'"

**Solution:** Make sure you're running commands from the backend directory
```bash
cd ../prompting_human_agent/backend
python3 -m src.main
```

### Issue: Migration fails with "table already exists"

**Solution:** The table may have been created manually. You can either:

1. Drop the table and re-run migration:
```bash
sqlite3 learning.db "DROP TABLE IF EXISTS student_proficiencies;"
alembic upgrade head
```

2. Or mark the migration as complete without running it:
```bash
alembic stamp head
```

### Issue: Tests fail with import errors

**Solution:** Make sure all dependencies are installed
```bash
pip install -r requirements.txt
```

## Manual Testing Workflow

### Test 1: New Student Initialization

1. Start backend server
2. Create new student session
3. Check database for proficiency records
4. Verify 26 proficiency records created (1 domain + 1 module + 24 items)

### Test 2: Activity Recommendations

1. Start an activity (e.g., multiple_choice)
2. Verify recommendations include:
   - difficulty: '3' (easy for first attempt)
   - num_questions: 10
   - focus_items: [] (empty for first attempt)
   - skip_activity: false

### Test 3: Optional Activity Skip

1. Manually set a student's module proficiency to 0.95 (>90%)
2. Start bubble_pop activity (marked as optional)
3. Verify recommendations include:
   - skip_activity: true
   - skip_reason: "You've mastered this content!..."

### Test 4: Proficiency Updates

1. Complete an activity with mixed results
2. Check database to see updated alpha/beta values
3. Verify mean_ability and confidence updated
4. Verify sample_count incremented

### Test 5: Forgetting Decay

1. Set last_updated to 10 days ago
2. Get recommendations
3. Verify ability has decayed toward 0.5 (prior)

## Performance Monitoring

### Key Metrics to Track

```sql
-- Average proficiency by level
SELECT level, AVG(mean_ability) as avg_ability, AVG(confidence) as avg_confidence
FROM student_proficiencies
GROUP BY level;

-- Students at mastery threshold
SELECT COUNT(DISTINCT student_id) as mastered_students
FROM student_proficiencies
WHERE level = 'module' AND mean_ability >= 0.85;

-- Most challenging items
SELECT item_id, AVG(mean_ability) as avg_ability
FROM student_proficiencies
WHERE level = 'item'
GROUP BY item_id
ORDER BY avg_ability ASC
LIMIT 10;

-- Skip rate for optional activities
SELECT 
  COUNT(*) as total_starts,
  SUM(CASE WHEN difficulty = 'skip' THEN 1 ELSE 0 END) as skips,
  ROUND(100.0 * SUM(CASE WHEN difficulty = 'skip' THEN 1 ELSE 0 END) / COUNT(*), 2) as skip_rate
FROM activity_attempts
WHERE activity_type = 'bubble_pop';
```

## Next Steps

Once the system is running:

1. **Monitor Initial Performance**
   - Track average proficiency growth
   - Identify items that are too easy/hard
   - Adjust difficulty ratings in curriculum

2. **Tune Parameters**
   - Adjust MASTERY_THRESHOLD (currently 0.85)
   - Adjust SKIP_THRESHOLD (currently 0.90)
   - Adjust forgetting rates based on retention data

3. **Expand Features**
   - Add GET endpoints for teacher dashboards
   - Implement student-specific learning rate tuning
   - Add proficiency trend visualization

4. **Scale Testing**
   - Test with multiple concurrent students
   - Verify query performance with large datasets
   - Optimize indexes if needed

## Support

For issues or questions:
- Check `BAYESIAN_PROFICIENCY_IMPLEMENTATION.md` for architecture details
- Check `BAYESIAN_PROFICIENCY_WITH_OPTIONAL_ACTIVITIES.md` for optional activity feature
- Review unit tests in `tests/test_bayesian_proficiency.py` for usage examples
