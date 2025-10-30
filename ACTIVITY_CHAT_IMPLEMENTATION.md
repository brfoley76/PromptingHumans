# Activity-Specific Helper Chat Implementation

## Overview

This document describes the implementation of activity-specific helper chat agents that provide contextual, difficulty-aware assistance during learning exercises.

## Architecture

### Embedded Chat System

The application uses an **embedded chat architecture** where chat panels are integrated directly into the UI:

1. **Main Tutor Chat**
   - Embedded in the selection screen (right side, fixed panel)
   - Persistent across main menu navigation
   - Provides general guidance and encouragement
   - Always visible on selection screen
   - Uses LLM-powered TutorAgent

2. **Activity Helper Chat**
   - Embedded in exercise screens (right panel)
   - Temporary, scoped to single activity attempt
   - Only visible during active exercises
   - Provides activity and difficulty-specific assistance
   - Automatically clears between attempts
   - Uses LLM-powered ActivityAgent

**Note:** Previous versions used floating widgets positioned at bottom-right and bottom-left. The current implementation uses fixed, embedded panels for better UX and mobile compatibility.

## Key Design Principles

### Frontend-Driven Behavior

**The frontend controls all activity-specific logic.** The backend is a generic agent service that responds to context provided by the frontend.

```javascript
// Frontend sends structured events with full context
wsClient.send({
  type: 'activity_event',
  event: 'wrong_answer',
  context: {
    question: currentQuestion,
    userAnswer: selectedAnswer,
    correctAnswer: correctWord,
    difficulty: 'easy',
    attemptNumber: 1
  }
});
```

### Backend Agnosticism

The backend:
- Does NOT hardcode activity rules
- Does NOT know about specific exercises
- Responds based on frontend-provided context
- Loads curriculum dynamically
- Generates responses using LLM (TutorAgent, ActivityAgent)

## Implementation Details

### 1. Chat Integration in app.js

**Main Tutor Chat:**
```javascript
// Setup in app.js
setupMainTutorListener() {
    this.wsClient.addMessageHandler((message) => {
        if (message.type === 'chat' && message.sender === 'agent') {
            this.sendToFixedChat('main', message.message, 'agent');
        }
    });
}

sendMainChatMessage() {
    const message = input.value.trim();
    this.sendToFixedChat('main', message, 'student');
    this.wsClient.send({
        type: 'chat',
        message: message
    });
}
```

**Activity Helper Chat:**
- Embedded in exercise screens using `.exercise-chat-panel` CSS class
- Managed by ActivityChatWidget.js
- Lifecycle tied to activity start/end

### 2. Exercise Completion Flow (NEW)

**Current Behavior:**
1. Exercise completes
2. Return to main page (NOT results screen)
3. Send results to backend via WebSocket
4. Backend LLM analyzes performance
5. Personalized summary displayed in main chat

```javascript
// In app.js showResults()
showResults(exerciseType, results) {
    // Record score locally
    this.scoreManager.recordScore(exerciseType, difficulty, results.score, results.total);
    
    // Send to backend for LLM summary
    this.wsClient.send({
        type: 'exercise_complete',
        exercise_type: exerciseType,
        difficulty: difficulty,
        score: results.score,
        total: results.total,
        percentage: results.percentage,
        answers: results.answers  // Full details for analysis
    });
    
    // Return to main page
    this.showScreen('selectionScreen');
    this.updateExerciseCards();
    
    // Show analyzing message
    this.sendToFixedChat('main', '📊 Analyzing your results...', 'agent');
}
```

### 3. Difficulty Behavior Configs

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

### 4. Activity-Specific Logic

Each activity's UI class controls when and how to interact with the helper chat:

```javascript
// Example: MultipleChoiceUI.js
onAnswerSubmit(isCorrect, difficulty) {
  const behavior = MultipleChoiceExercise.DIFFICULTY_BEHAVIORS[difficulty];
  
  if (!isCorrect && behavior.feedbackTiming === 'immediate') {
    // Send event to backend via WebSocket
    this.app.wsClient.send({
      type: 'activity_event',
      event: 'wrong_answer',
      context: {
        question: this.currentQuestion.definition,
        userAnswer: this.selectedAnswer,
        correctAnswer: this.currentQuestion.word,
        difficulty: difficulty,
        attemptNumber: this.attemptNumber
      }
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

### Activity Start (Frontend → Backend)

```json
{
  "type": "activity_start",
  "activity": "multiple_choice",
  "difficulty": "easy"
}
```

### Activity Events (Frontend → Backend)

```json
{
  "type": "activity_event",
  "event": "wrong_answer",
  "context": {
    "question": "A person who sails the seas",
    "userAnswer": "treasure",
    "correctAnswer": "pirate",
    "attemptNumber": 1
  }
}
```

### Activity Chat Messages (Frontend → Backend)

```json
{
  "type": "activity_chat",
  "sender": "student",
  "message": "I don't understand this word"
}
```

### Exercise Complete (Frontend → Backend) - NEW

```json
{
  "type": "exercise_complete",
  "exercise_type": "multiple_choice",
  "difficulty": "4",
  "score": 8,
  "total": 10,
  "percentage": 80,
  "answers": [
    {
      "questionNumber": 1,
      "definition": "A person who sails the seas",
      "userAnswer": "pirate",
      "correctAnswer": "pirate",
      "isCorrect": true
    },
    {
      "questionNumber": 2,
      "definition": "A colorful bird",
      "userAnswer": "treasure",
      "correctAnswer": "parrot",
      "isCorrect": false
    }
  ]
}
```

### Agent Responses (Backend → Frontend)

```json
{
  "type": "activity_chat",
  "sender": "agent",
  "message": "Let me help you think about this...",
  "timestamp": "2025-10-30T14:30:00Z"
}
```

```json
{
  "type": "chat",
  "sender": "agent",
  "agent_type": "tutor",
  "message": "Great job! You got 8 out of 10 correct! I noticed you confused 'pirate' and 'treasure' on question 2...",
  "timestamp": "2025-10-30T14:35:00Z",
  "exercise_summary": true
}
```

### Activity End (Frontend → Backend)

```json
{
  "type": "activity_end",
  "score": 8,
  "total": 10
}
```

## Integration Checklist

### Frontend (Per Activity)

- [x] Add difficulty behavior config to Exercise class
- [x] Update UI class to use embedded chat
- [x] Implement `activity_start` WebSocket message when exercise begins
- [x] Implement `activity_end` WebSocket message when exercise ends
- [x] Add `activity_event` calls at appropriate points:
  - [x] Wrong answers (if immediate feedback)
  - [x] Correct answers (if confirmation needed)
  - [x] Hint requests
  - [x] Activity completion (for metacognitive prompts)
- [x] Handle agent responses in UI
- [x] Implement `exercise_complete` message with full results

### Backend

- [x] Update WebSocket handler to recognize activity events
- [x] Implement activity event routing
- [x] Add metacognitive prompt generation
- [x] Ensure curriculum-agnostic design
- [x] Implement `exercise_complete` handler with LLM summary generation

## File Structure

```
web/
├── js/
│   ├── integration/
│   │   ├── ChatWidget.js              # Main tutor chat (embedded)
│   │   ├── ActivityChatWidget.js      # Activity helper chat (embedded)
│   │   ├── WebSocketClient.js         # WebSocket communication
│   │   ├── SessionManager.js          # Session management
│   │   └── APIClient.js               # REST API client
│   ├── exercises/
│   │   ├── multipleChoice/
│   │   │   ├── MultipleChoiceExercise.js  # Logic + behavior config
│   │   │   └── MultipleChoiceUI.js        # UI + chat integration
│   │   ├── fillInBlank/
│   │   │   ├── FillInBlankExercise.js
│   │   │   └── FillInBlankUI.js
│   │   ├── spelling/
│   │   │   ├── SpellingExercise.js
│   │   │   └── SpellingUI.js
│   │   ├── bubblePop/
│   │   │   ├── BubblePopExercise.js
│   │   │   └── BubblePopUI.js
│   │   └── fluentReading/
│   │       ├── FluentReadingExercise.js
│   │       └── FluentReadingUI.js
│   └── app.js                         # Main app initialization
├── css/
│   ├── chat-widget.css                # Main chat styles
│   ├── activity-chat-widget.css       # Activity chat styles (deprecated)
│   ├── exercise-chat.css              # Embedded exercise chat styles
│   └── new-layout.css                 # Main layout with embedded chat
└── index.html                         # Includes embedded chat panels
```

## CSS Classes

### Main Chat (Selection Screen)
- `.chat-window-fixed` - Fixed chat panel
- `.chat-messages-area` - Scrollable message container
- `.chat-input-area` - Input field and send button

### Activity Chat (Exercise Screens)
- `.exercise-chat-panel` - Embedded chat in exercise
- `.exercise-chat-messages` - Message container
- `.exercise-chat-input` - Input area
- `.exercise-chat-header` - Header with minimize button

## Implementation Status

✅ **Complete:**
- Embedded chat architecture
- Main tutor chat with LLM
- Activity helper chat with LLM
- Exercise completion flow with LLM summaries
- All 5 exercises integrated
- WebSocket message routing
- Backend agent system (TutorAgent, ActivityAgent)

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
- Personalized LLM feedback
- Seamless integration with exercises
