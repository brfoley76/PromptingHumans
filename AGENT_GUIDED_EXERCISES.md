# Agent-Guided Exercise Implementation Plan

## Overview
Transform exercises from student-controlled settings to agent-guided experiences where:
1. Settings panels are suppressed (moved to dev mode)
2. Instruction overlays are removed
3. Agent introduces each activity via chat
4. Students click to start after agent instructions
5. Chat window is fixed on right side during exercises

## Implementation Status

### ✅ Phase 1: Core Setup (COMPLETE)
- [x] Add EXERCISE_DEFAULTS constants to app.js
- [x] Add AGENT_INSTRUCTIONS templates to app.js

### 🔄 Phase 2: Exercise UI Modifications (IN PROGRESS)

#### Multiple Choice
- [ ] Skip settings panel, use defaults
- [ ] Add agent intro message
- [ ] Add "click to start" overlay
- [ ] Position chat on right side

#### Fill in the Blank
- [ ] Skip settings panel, use defaults
- [ ] Add agent intro message
- [ ] Add "click to start" overlay
- [ ] Position chat on right side

#### Spelling
- [ ] Skip settings panel, use defaults
- [ ] Add agent intro message
- [ ] Add "click to start" overlay
- [ ] Position chat on right side

#### Bubble Pop
- [ ] Skip settings panel, use defaults
- [ ] Remove instruction overlay
- [ ] Add agent intro message
- [ ] Add "click to start" overlay
- [ ] Position chat on right side

#### Fluent Reading
- [ ] Skip settings panel, use defaults
- [ ] Remove instruction overlay
- [ ] Add agent intro message
- [ ] Add "click to start" overlay
- [ ] Position chat on right side

### 📋 Phase 3: Layout Changes
- [ ] Create exercise screen CSS with right-side chat
- [ ] Add "click to start" overlay styles
- [ ] Ensure chat stays visible during exercises
- [ ] Hide main tutor chat, show only activity chat

### 🛠️ Phase 4: Dev Mode Enhancements
- [ ] Add exercise settings section to dev panel
- [ ] Allow override of default settings
- [ ] Add toggle to show/hide settings panels

### 🧪 Phase 5: Testing
- [ ] Test each exercise with default settings
- [ ] Test agent intro messages
- [ ] Test click-to-start mechanism
- [ ] Test chat positioning
- [ ] Test dev mode overrides

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
2. Exercise screen loads with chat on right
3. Agent sends intro message via activity chat
4. "Click to start" overlay appears
5. User clicks anywhere to begin
6. Exercise runs with chat visible
7. Results shown, chat provides feedback

### Layout Structure
```
┌────────────────────────────────────┬────────────────┐
│                                    │                 │
│        Exercise Area               │  Activity Chat  │
│      (Canvas/Questions)            │  (Fixed, Open)  │
│                                    │                 │
│                                    │  Agent: "..."   │
│      [Click to Start]              │                 │
│                                    │  [Input]        │
└────────────────────────────────────┴────────────────┘
```

## Next Steps
1. Modify MultipleChoiceUI.js to implement new flow
2. Create reusable "click to start" component
3. Add agent message triggering system
4. Repeat for other exercises
5. Add dev mode settings panel
6. Test complete flow

## Notes
- Settings panels remain in HTML for dev mode access
- Agent messages use AGENT_INSTRUCTIONS templates
- Default settings can be overridden in dev mode
- Chat positioning uses CSS flexbox layout
