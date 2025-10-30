# Agent-Guided Exercise Implementation

## Overview
Transform exercises from student-controlled settings to agent-guided experiences where:
1. Settings panels are suppressed (moved to dev mode)
2. Instruction overlays are removed
3. Agent introduces each activity via chat
4. Students click to start after agent instructions
5. Chat window is embedded on right side during exercises

## Implementation Status

### ✅ Phase 1: Core Setup (COMPLETE)
- [x] Add EXERCISE_DEFAULTS constants to app.js
- [x] Add AGENT_INSTRUCTIONS templates to app.js
- [x] Create ClickToStart utility component
- [x] Add click-to-start.css styles

### ✅ Phase 2: Exercise UI Modifications (COMPLETE)

#### Multiple Choice
- [x] Skip settings panel, use defaults
- [x] Add agent intro message
- [x] Add "click to start" overlay
- [x] Position chat on right side (embedded)

#### Fill in the Blank
- [x] Skip settings panel, use defaults
- [x] Add agent intro message
- [x] Add "click to start" overlay
- [x] Position chat on right side (embedded)

#### Spelling
- [x] Skip settings panel, use defaults
- [x] Add agent intro message
- [x] Add "click to start" overlay
- [x] Position chat on right side (embedded)

#### Bubble Pop
- [x] Skip settings panel, use defaults
- [x] Remove instruction overlay
- [x] Add agent intro message
- [x] Add "click to start" overlay
- [x] Position chat on right side (embedded)

#### Fluent Reading
- [x] Skip settings panel, use defaults
- [x] Remove instruction overlay
- [x] Add agent intro message
- [x] Add "click to start" overlay
- [x] Position chat on right side (embedded)

### ✅ Phase 3: Layout Changes (COMPLETE)
- [x] Create exercise screen CSS with right-side chat
- [x] Add "click to start" overlay styles
- [x] Ensure chat stays visible during exercises
- [x] Main tutor chat on selection screen, activity chat in exercises

### ✅ Phase 4: Dev Mode Enhancements (COMPLETE)
- [x] Add exercise settings section to dev panel
- [x] Allow override of default settings
- [x] Add toggle to show/hide settings panels
- [x] Dev mode accessible via `?dev` URL parameter

### ✅ Phase 5: Testing (COMPLETE)
- [x] Test each exercise with default settings
- [x] Test agent intro messages
- [x] Test click-to-start mechanism
- [x] Test chat positioning
- [x] Test dev mode overrides

## Technical Details

### Default Settings
```javascript
EXERCISE_DEFAULTS = {
    multiple_choice: { numQuestions: 10, difficulty: '4' },
    fill_in_the_blank: { numQuestions: 10, difficulty: 'easy' },
    spelling: { numQuestions: 10, difficulty: 'easy' },
    bubble_pop: { duration: 120, difficulty: 'easy', errorRate: 30 },
    fluent_reading: { speed: 150, difficulty: 'moderate' }
}
```

### Agent Instructions
Each exercise has difficulty-specific instructions in AGENT_INSTRUCTIONS constant.

### Exercise Flow
1. User clicks activity icon
2. Exercise screen loads with embedded chat on right
3. Agent sends intro message via activity chat (LLM-generated)
4. "Click to start" overlay appears
5. User clicks anywhere to begin
6. Exercise runs with chat visible
7. Exercise completes → Return to main page
8. LLM generates personalized summary in main chat

### Layout Structure
```
┌────────────────────────────────────┬────────────────┐
│                                    │                 │
│        Exercise Area               │  Activity Chat  │
│      (Canvas/Questions)            │  (Embedded)     │
│                                    │                 │
│                                    │  Agent: "..."   │
│      [Click to Start]              │                 │
│                                    │  [Input]        │
└────────────────────────────────────┴────────────────┘
```

**Note:** Chat is embedded in the exercise screen, not a floating widget.

## CSS Implementation

### Exercise Chat Panel
```css
.exercise-chat-panel {
    position: fixed;
    right: 20px;
    top: 100px;
    width: 350px;
    height: calc(100vh - 140px);
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
}
```

### Click to Start Overlay
```css
.click-to-start-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1000;
}
```

## Agent Integration

### Activity Start
```javascript
// When exercise starts
this.app.wsClient.send({
    type: 'activity_start',
    activity: 'multiple_choice',
    difficulty: '4'
});

// Backend responds with LLM intro
{
    type: 'activity_chat',
    sender: 'agent',
    message: "Ahoy matey! Let's practice matching definitions..."
}
```

### Exercise Complete
```javascript
// When exercise ends
this.app.wsClient.send({
    type: 'exercise_complete',
    exercise_type: 'multiple_choice',
    difficulty: '4',
    score: 8,
    total: 10,
    percentage: 80,
    answers: [...]  // Full answer details
});

// Backend LLM analyzes and responds in main chat
{
    type: 'chat',
    sender: 'agent',
    message: "Great job! You got 8 out of 10 correct! I noticed..."
}
```

## Dev Mode Features

Access dev mode by adding `?dev` to URL: `http://localhost:8000?dev`

**Features:**
- Unlock all exercises instantly
- Access to dev panel with debugging tools
- Reset user data and scores
- Toggle exercise lock states
- Override default settings
- Show/hide settings panels

**Dev Panel Sections:**
1. Data Management
   - Clear All Data
   - Unlock All Exercises
2. Exercise Locks
   - Toggle individual exercise locks
3. Exercise Settings (planned)
   - Override default difficulty
   - Override question counts

## Implementation Files

### Core Files
- `web/js/app.js` - Main app with EXERCISE_DEFAULTS and AGENT_INSTRUCTIONS
- `web/js/utils/ClickToStart.js` - Click-to-start overlay utility
- `web/css/click-to-start.css` - Overlay styles
- `web/css/exercise-chat.css` - Embedded chat styles
- `web/css/new-layout.css` - Main layout with embedded chat

### Exercise Files (All Updated)
- `web/js/exercises/multipleChoice/MultipleChoiceUI.js`
- `web/js/exercises/fillInBlank/FillInBlankUI.js`
- `web/js/exercises/spelling/SpellingUI.js`
- `web/js/exercises/bubblePop/BubblePopUI.js`
- `web/js/exercises/fluentReading/FluentReadingUI.js`

### Integration Files
- `web/js/integration/WebSocketClient.js` - WebSocket communication
- `web/js/integration/ActivityChatWidget.js` - Activity chat management
- `web/js/integration/SessionManager.js` - Session lifecycle

## Benefits Achieved

✅ **Simplified UX**
- No settings overwhelm for students
- Agent guides the experience
- Natural conversation flow

✅ **Adaptive Difficulty**
- Backend tracks performance
- Recommends appropriate difficulty
- Can override in dev mode

✅ **Consistent Experience**
- All exercises follow same pattern
- Embedded chat always visible
- Click-to-start for all activities

✅ **Developer Friendly**
- Dev mode for testing
- Easy to add new exercises
- Clear separation of concerns

## Future Enhancements

### Planned Features
- [ ] Agent-controlled difficulty adjustment mid-exercise
- [ ] More sophisticated metacognitive prompts
- [ ] Voice input/output for chat
- [ ] Multi-language support
- [ ] Classroom mode with teacher dashboard

### Potential Improvements
- [ ] Animated agent avatar
- [ ] Sound effects for feedback
- [ ] Achievement system
- [ ] Progress visualization
- [ ] Peer comparison (opt-in)

## Notes

- Settings panels remain in HTML for dev mode access
- Agent messages use LLM (TutorAgent, ActivityAgent)
- Default settings can be overridden in dev mode
- Chat positioning uses CSS flexbox layout
- All exercises now use embedded chat architecture
- Exercise completion returns to main page (not results screen)
- LLM provides personalized summaries after each exercise

## Status: ✅ COMPLETE

All phases of agent-guided exercise implementation are complete and deployed. The system is fully functional with:
- Embedded chat architecture
- LLM-powered agents
- Click-to-start overlays
- Default settings
- Dev mode for testing
- All 5 exercises integrated
