# State Synchronization Strategy

## Overview

This document describes how student progress and state are synchronized between the frontend (browser localStorage) and backend (SQLite database) in the learning module application.

## Architecture

### Frontend State (localStorage)
- **Location**: Browser localStorage
- **Purpose**: Fast local access, offline capability, immediate UI updates
- **Scope**: Single browser/device
- **Persistence**: Until browser data is cleared

### Backend State (Database)
- **Location**: SQLite database (development) / PostgreSQL (production)
- **Purpose**: Persistent storage, cross-device sync, analytics, adaptive difficulty
- **Scope**: All devices for a student
- **Persistence**: Permanent

## Data Flow

### 1. User Registration/Login

```
Frontend                          Backend
   |                                 |
   |-- POST /api/session/init ------>|
   |   (username, module_id)         |
   |                                 |
   |<-- Session + Progress Data -----|
   |   (session_id, student_id,      |
   |    progress, is_returning)      |
   |                                 |
   |-- Store in localStorage ------->|
```

**Frontend Actions:**
- User enters username
- App calls `SessionManager.initSession(username)`
- Receives backend progress data
- Merges with any local progress via `ScoreManager.mergeBackendProgress()`
- Stores merged state in localStorage

**Backend Actions:**
- Checks if student exists by username
- Creates new student if needed
- Creates new session
- Returns student progress from database
- Marks as returning student if exists

### 2. Activity Completion

```
Frontend                          Backend
   |                                 |
   |-- POST /api/activity/end ------>|
   |   (session_id, results,         |
   |    tuning_settings)              |
   |                                 |
   |<-- Feedback + Unlocks ----------|
   |   (feedback, unlocked_activities,|
   |    next_recommendation)          |
   |                                 |
   |-- Update localStorage --------->|
```

**Frontend Actions:**
- Exercise completes
- App calls `APIClient.endActivity()`
- Receives unlock information
- Updates localStorage via `ScoreManager.recordScore()`
- Updates UI to show unlocked exercises

**Backend Actions:**
- Records activity attempt in database
- Calculates if unlock conditions met (≥80% on hard difficulty)
- Updates student progress
- Returns feedback and unlock status

### 3. Adaptive Difficulty

```
Frontend                          Backend
   |                                 |
   |-- POST /api/activity/start ---->|
   |   (session_id, activity_type)   |
   |                                 |
   |<-- Recommended Tuning ----------|
   |   (difficulty, num_questions,   |
   |    agent_intro)                  |
   |                                 |
   |-- Apply Settings -------------->|
```

**Backend Actions:**
- Queries last 5 attempts for this activity
- Calculates average performance
- Determines appropriate difficulty:
  - ≥85% → Hard
  - 65-85% → Medium
  - <65% → Easy
- Returns activity-specific tuning parameters

## Synchronization Rules

### Rule 1: Backend is Source of Truth for Progress
- On session init, backend progress takes precedence
- Local progress is merged but backend data wins on conflicts
- Unlocked exercises come from backend

### Rule 2: Local State for Immediate Feedback
- Score recording happens locally first for instant UI updates
- Backend sync happens asynchronously
- If backend sync fails, local state persists until next sync

### Rule 3: Username-Based Identity
- Students identified by unique username (alphanumeric only)
- Same username = same student across devices
- No password required (educational context)

### Rule 4: Session-Based Tracking
- Each login creates a new session
- All activities during that session linked to session_id
- Sessions can be analyzed for learning patterns

## Conflict Resolution

### Scenario 1: Student Uses Multiple Devices

**Problem**: Student completes exercises on Device A, then logs in on Device B

**Resolution**:
1. Device B calls `/api/session/init`
2. Backend returns latest progress (includes Device A's work)
3. Device B merges backend progress with any local progress
4. Backend progress takes precedence for unlocks
5. Local scores preserved if not in backend

### Scenario 2: Offline Usage

**Problem**: Student works offline, then reconnects

**Resolution**:
1. Exercises work offline using localStorage
2. On reconnect, session init syncs progress
3. Local scores sent to backend on next activity end
4. Backend records all attempts with timestamps

### Scenario 3: Browser Data Cleared

**Problem**: Student clears browser data

**Resolution**:
1. localStorage lost
2. On next login, backend restores all progress
3. Student continues from where they left off
4. No data loss

## Data Structures

### Frontend (localStorage)

```javascript
{
  "currentUser": "student123",
  "studentId": "uuid-here",
  "sessionId": "session-uuid",
  "users": {
    "student123": {
      "name": "student123",
      "studentId": "uuid-here",
      "createdAt": "2025-10-30T...",
      "exercises": {
        "multiple_choice": {
          "unlocked": true,
          "scores": [
            {
              "difficulty": "4",
              "score": 8,
              "total": 10,
              "percentage": 80,
              "timestamp": "2025-10-30T..."
            }
          ],
          "bestScore": 80
        }
      }
    }
  }
}
```

### Backend (Database)

```sql
-- Students table
student_id | name        | grade_level | created_at
uuid       | student123  | 3           | 2025-10-30...

-- Sessions table
session_id | student_id | module_id | start_time | end_time
uuid       | uuid       | r003.1    | 2025-10... | NULL

-- ActivityAttempts table
attempt_id | session_id | student_id | activity        | score | total | difficulty
uuid       | uuid       | uuid       | multiple_choice | 8     | 10    | 4

-- Progress (computed from attempts)
{
  "unlocked_exercises": ["multiple_choice", "fill_in_the_blank"],
  "total_attempts": 5,
  "average_score": 82.5
}
```

## API Endpoints for Sync

### Session Initialization
```
POST /api/session/init
Request: { username, module_id }
Response: { session_id, student_id, progress, is_returning_student }
```

### Activity End (Sync Point)
```
POST /api/activity/end
Request: { session_id, activity_type, results, tuning_settings }
Response: { feedback, unlocked_activities, next_recommendation }
```

### Session End
```
POST /api/session/end
Request: { session_id }
Response: { status: "success" }
```

## Best Practices

### For Frontend Developers

1. **Always sync on session init**: Call `SessionManager.initSession()` on app load
2. **Merge backend progress**: Use `ScoreManager.mergeBackendProgress()` to combine states
3. **Handle sync failures gracefully**: Keep local state if backend unavailable
4. **Update localStorage after backend confirms**: Wait for API response before updating UI

### For Backend Developers

1. **Return complete progress**: Include all unlocked exercises and stats
2. **Use transactions**: Ensure atomic updates for attempts and unlocks
3. **Validate session_id**: Always verify session exists and is active
4. **Calculate adaptive difficulty**: Use performance history for recommendations

## Monitoring & Debugging

### Frontend Debug
```javascript
// View current state
console.log(localStorage.getItem('learningModuleData'));

// Check sync status
console.log(window.sessionManager.isConnected());
```

### Backend Debug
```sql
-- Check student progress
SELECT * FROM students WHERE name = 'student123';
SELECT * FROM activity_attempts WHERE student_id = 'uuid' ORDER BY date DESC;

-- Verify unlocks
SELECT * FROM activity_attempts 
WHERE student_id = 'uuid' 
  AND score::float / total >= 0.8 
  AND difficulty IN ('5', 'hard', 'moderate');
```

## Future Enhancements

1. **Real-time Sync**: WebSocket-based progress updates
2. **Conflict Resolution UI**: Show merge conflicts to user
3. **Offline Queue**: Queue API calls when offline, sync when online
4. **Multi-device Notifications**: Alert when progress synced from another device
5. **Progress Export**: Allow students to export their data
6. **Teacher Dashboard**: View student progress across devices

## Security Considerations

1. **Username Validation**: Alphanumeric only, prevents injection
2. **Session Validation**: All API calls verify session_id
3. **Rate Limiting**: Prevent abuse (to be implemented)
4. **Data Privacy**: Student data isolated by student_id
5. **No Passwords**: Educational context, but consider adding for production

## Testing Sync

### Test Scenario 1: New Student
1. Enter username "newstudent"
2. Verify backend creates student
3. Verify localStorage initialized
4. Complete exercise
5. Verify both localStorage and database updated

### Test Scenario 2: Returning Student
1. Login as existing student
2. Verify backend returns progress
3. Verify localStorage updated with backend data
4. Verify unlocked exercises match backend

### Test Scenario 3: Cross-Device
1. Login on Device A, complete exercises
2. Login on Device B with same username
3. Verify Device B shows progress from Device A
4. Complete exercise on Device B
5. Login on Device A again
6. Verify Device A shows all progress

## Conclusion

The state synchronization strategy ensures:
- ✅ Consistent progress across devices
- ✅ Fast local performance
- ✅ Reliable backend persistence
- ✅ Graceful offline handling
- ✅ Adaptive difficulty based on history
- ✅ No data loss on browser clear

The backend is the source of truth, but the frontend provides immediate feedback and offline capability. This hybrid approach balances performance with reliability.
