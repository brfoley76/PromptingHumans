# Agent Tone and UI Awareness Improvements

## Overview
Updated agent communication style to be clearer and more appropriate for students who struggle with reading, and added UI state awareness so agents can guide students through the interface.

## Changes Made

### 1. System Prompt Updates (`llm_agent.py`)

**Before:**
- "Be warm and encouraging"
- "Celebrate progress enthusiastically"
- "Keep responses brief (2-3 sentences maximum)"

**After:**
- "Use very simple words only"
- "Keep every response to 1 short sentence"
- "Be clear and direct, not playful"
- "Avoid idioms, metaphors, or complex phrases"
- "Some students struggle with reading, so keep it simple"

### 2. All Prompt Templates Updated

Changed every agent prompt from requesting "2-3 sentences" to "1 short sentence only":

- `get_welcome_message()`: "Use 1 short sentence only"
- `get_correct_response()`: "Say 'Good' or 'Correct' in 1 short sentence"
- `get_error_introduction()`: "Tell them to try again in 1 short sentence"
- `ask_for_reasoning()`: "Use 1 short sentence"
- `provide_hint()`: "Use 1 short sentence"
- `provide_full_explanation()`: "Use 1 short sentence with simple words"
- `get_final_feedback()`: "Tell them they did well in 1 short sentence"
- `get_activity_intro()`: "Use 1 short sentence"
- `get_activity_feedback()`: "Tell them they did good in 1 short sentence"

### 3. UI State Awareness

**Added `activity_state` parameter to TutorAgent:**
```python
def __init__(self, student_name: str, module_id: str, activity_state: Optional[Dict] = None)
```

**Activity state includes:**
- `available`: List of all activities in the module
- `unlocked`: List of activities the student can access

**System prompt now includes:**
```
AVAILABLE ACTIVITIES:
- Word Quiz (ready)
- Fill It In (locked)
- Spell It (locked)
...

You can tell students which button to click, like 'Click the Word Quiz button to start.'
```

### 4. Integration Points

**Updated `agent_factory.py`:**
- `create_tutor_agent()` now accepts `activity_state` parameter
- Passes state to LLMTutorAgent constructor

**Updated `routes.py`:**
- Builds activity state from student progress
- Passes state when creating tutor agent:
```python
activity_state = {
    'available': available_activities,
    'unlocked': unlocked_activities if unlocked_activities else [available_activities[0]]
}
agent = AgentFactory.create_tutor_agent(student.name, request.module_id, activity_state=activity_state)
```

### 5. Activity Agent Lifecycle

**Verified proper cleanup:**
- `AgentManager.start_activity()` calls `end_activity()` first if agent exists
- `end_activity()` sets `self.current_activity_agent = None`
- Each activity attempt gets a fresh agent with no history
- Frontend `ActivityChatWidget.startActivity()` calls `clearMessages()`

## Benefits

### For Students Who Struggle with Reading:
- **Shorter responses**: 1 sentence vs 2-3 sentences
- **Simpler words**: Explicit instruction to use very simple vocabulary
- **Clearer communication**: Direct, not playful or metaphorical
- **Less cognitive load**: Easier to process and understand

### For All Students:
- **UI guidance**: Agent can say "Click the Word Quiz button"
- **Activity awareness**: Agent knows what's available and what's locked
- **Contextual help**: Agent can suggest next steps based on progress
- **Fresh start**: Each activity attempt has clean chat history

## Module-Specific vs App-Wide

**Important**: The pirate theme is module-specific (in `r003.1.json`), not app-wide:
- Agent tone is now neutral and clear
- No pirate language in agent responses
- Pirate vocabulary is just data for learning
- App works with any curriculum module

## Example Interactions

**Before:**
- "Wow! You got that right! Great job! Keep up the amazing work!"

**After:**
- "Good job."

**Before:**
- "Let me help you think about this problem. Can you tell me how you got that answer? I'm curious about your thinking!"

**After:**
- "Try again."

**UI Guidance (New):**
- "Click the Word Quiz button to start."
- "You unlocked Fill It In."
- "Do Word Quiz first."

## Testing

To test the changes:
1. Start a new session
2. Observe shorter, clearer agent responses
3. Ask agent about activities - should reference UI buttons
4. Complete an activity and restart it - chat should be empty
5. Verify no "pirate talk" in agent responses (vocabulary words are fine)

## Files Modified

- `backend/src/agents/llm_agent.py` - System prompt and all prompt templates
- `backend/src/agents/agent_factory.py` - Added activity_state parameter
- `backend/src/agents/agent_manager.py` - Updated prompts to "1 short sentence"
- `backend/src/api/routes.py` - Build and pass activity state
- Frontend already handles chat clearing properly

## Configuration

No new configuration needed. Changes are automatic and apply to all LLM agents.
