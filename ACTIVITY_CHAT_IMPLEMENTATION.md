# Activity-Specific Helper Chat Implementation

## Overview

This document describes the implementation of activity-specific helper chat agents that provide contextual, difficulty-aware assistance during learning exercises.

## Architecture

### Dual Chat System

1. **Main Tutor Chat** (`ChatWidget.js`)
   - Persistent across the application
   - Available on the main menu screen
   - Provides general guidance and encouragement
   - Positioned bottom-right corner

2. **Activity Helper Chat** (`ActivityChatWidget.js`)
   - Temporary, scoped to single activity attempt
   - Only visible during active exercises
   - Provides activity and difficulty-specific assistance
   - Positioned bottom-left corner (or stacks on mobile)
   - Automatically clears between attempts

## Key Design Principles

### Frontend-Driven Behavior

**The frontend controls all activity-specific logic.** The backend is a generic agent service that responds to context provided by the frontend.

```javascript
// Frontend sends structured events with full context
activityChat.sendActivityEvent('wrong_answer', {
  question: currentQuestion,
  userAnswer: selectedAnswer,
  difficulty: 'easy',
  behavior: 'immediate_hint',
  attempt: attemptNumber
});
```

### Backend Agnosticism

The backend:
- Does NOT hardcode activity rules
- Does NOT know about specific exercises
- Responds based on frontend-provided context
- Loads curriculum dynamically
- Generates responses using LLM or rule-based logic

## Implementation Details

### 1. ActivityChatWidget.js

**Location:** `web/js/integration/ActivityChatWidget.js`

**Key Methods:**
- `startActivity(activityType, difficulty)` - Initialize for new activity
- `endActivity()` - Clean up and hide
- `sendActivityEvent(eventType, context)` - Send structured events to backend
- `addMessage(sender, message)` - Display messages in chat

**Features:**
- Separate message history per activity
- Auto-clears between attempts
- WebSocket integration
- Minimizable interface

### 2. Difficulty Behavior Configs

Each activity defines its own difficulty behaviors:

```javascript
// Example: MultipleChoiceExercise.js
static DIFFICULTY_BEHAVIORS = {
  'easy': {
    feedbackTiming: 'immediate',      // Feedback after each answer
    hintsPerMistake: 'unlimited',     // Unlimited hints
    confirmCorrections: true          // Confirm when fixed
  },
  'medium': {
    feedbackTiming: 'per_question',   // One hint per question
    hintsPerMistake: 1,
    confirmCorrections: true
  },
  'hard': {
    feedbackTiming: 'end_only',       // Feedback only at end
    hintsPerMistake: 0,
    confirmCorrections: false
  }
}
```

### 3. Activity-Specific Logic

Each activity's UI class controls when and how to interact with the helper chat:

```javascript
// Example: MultipleChoiceUI.js
onAnswerSubmit(isCorrect, difficulty) {
  const behavior = MultipleChoiceExercise.DIFFICULTY_BEHAVIORS[difficulty];
  
  if (!isCorrect && behavior.feedbackTiming === 'immediate') {
    // Send event to activity chat
    this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
      question: this.currentQuestion,
      userAnswer: this.selectedAnswer,
      correctAnswer: this.currentQuestion.word,
      difficulty: difficulty,
      behavior: 'immediate_hint'
    });
  }
}
```

## Planned Behavior by Activity

### Multiple Choice

**Easy:**
- Agent interjects with each mistake
- Prompts student to think about the words
- Confirms when student fixes mistake
- Unlimited hints

**Medium:**
- One hint given per mistake
- Fixes accepted without additional prompting
- More independence expected

**Hard:**
- No immediate feedback
- Feedback only at end after score accepted
- Student works independently

### Fill in the Blank

**Easy:**
- Similar to Multiple Choice Easy
- Immediate feedback on mistakes
- Hints about word meanings

**Medium:**
- One hint per mistake
- Less hand-holding

**Hard:** (To be implemented)
- End-only feedback
- No hints during exercise

### Spelling

**Easy:**
- Immediate feedback on misspellings
- Hints about word structure
- Encouragement to try again

**Medium:**
- One hint per word
- More independence

**Hard:**
- End-only feedback
- No hints during exercise

### Bubble Pop & Fluent Reading

**All Difficulties:**
- Minimal interruption during gameplay
- **Metacognitive prompts at end:**
  - "Which words were hardest for you?"
  - "What strategies did you use?"
  - "Did you notice any patterns?"
  - "What would you do differently next time?"

## WebSocket Message Format

### Activity Events (Frontend → Backend)

```json
{
  "type": "activity_event",
  "activity": "multiple_choice",
  "difficulty": "easy",
  "event": "wrong_answer",
  "context": {
    "question": "A person who sails the seas",
    "userAnswer": "treasure",
    "correctAnswer": "pirate",
    "behavior": "immediate_hint",
    "attempt": 1
  }
}
```

### Activity Chat Messages (Frontend → Backend)

```json
{
  "type": "activity_chat",
  "activity": "multiple_choice",
  "difficulty": "easy",
  "sender": "student",
  "message": "I don't understand this word"
}
```

### Agent Responses (Backend → Frontend)

```json
{
  "type": "activity_chat",
  "sender": "agent",
  "message": "Let me help you think about this..."
}
```

```json
{
  "type": "activity_hint",
  "hint": "Think about what pirates do on ships"
}
```

```json
{
  "type": "activity_feedback",
  "feedback": "Great job! You got it right this time!"
}
```

## Integration Checklist

### Frontend (Per Activity)

- [ ] Add difficulty behavior config to Exercise class
- [ ] Update UI class to use ActivityChatWidget
- [ ] Implement `startActivity()` call when exercise begins
- [ ] Implement `endActivity()` call when exercise ends
- [ ] Add `sendActivityEvent()` calls at appropriate points:
  - [ ] Wrong answers (if immediate feedback)
  - [ ] Correct answers (if confirmation needed)
  - [ ] Hint requests
  - [ ] Activity completion (for metacognitive prompts)
- [ ] Handle agent responses in UI

### Backend

- [ ] Update WebSocket handler to recognize activity events
- [ ] Implement activity event routing
- [ ] Add metacognitive prompt generation
- [ ] Ensure curriculum-agnostic design

## File Structure

```
web/
├── js/
│   ├── integration/
│   │   ├── ChatWidget.js              # Main tutor chat
│   │   ├── ActivityChatWidget.js      # Activity helper chat
│   │   ├── WebSocketClient.js         # WebSocket communication
│   │   └── SessionManager.js          # Session management
│   ├── exercises/
│   │   ├── multipleChoice/
│   │   │   ├── MultipleChoiceExercise.js  # Logic + behavior config
│   │   │   └── MultipleChoiceUI.js        # UI + chat integration
│   │   ├── fillInBlank/
│   │   ├── spelling/
│   │   ├── bubblePop/
│   │   └── fluentReading/
│   └── app.js                         # Main app initialization
├── css/
│   ├── chat-widget.css                # Main chat styles
│   └── activity-chat-widget.css       # Activity chat styles
└── index.html                         # Includes both chat widgets
```

## Next Steps

1. **Implement difficulty configs** for each activity
2. **Add chat integration** to each activity's UI class
3. **Update backend WebSocket handler** to support activity events
4. **Add hard mode** to Fill in the Blank
5. **Implement metacognitive prompts** for Bubble Pop and Fluent Reading
6. **Test each difficulty level** for each activity

## Benefits of This Architecture

✅ **Separation of Concerns**
- Frontend controls UI and behavior logic
- Backend provides generic agent services
- Clear boundaries between components

✅ **Flexibility**
- Easy to add new activities
- Easy to modify difficulty behaviors
- Backend doesn't need updates for new activities

✅ **Maintainability**
- Activity-specific code lives with the activity
- No hardcoded rules in backend
- Self-documenting behavior configs

✅ **Scalability**
- Can add new difficulty levels easily
- Can customize behavior per activity
- Backend scales to any curriculum

✅ **User Experience**
- Context-aware assistance
- Difficulty-appropriate scaffolding
- Non-intrusive help when needed
