# Learning Module - Pirate Vocabulary Adventure

An interactive educational platform for 3rd-grade reading and spelling exercises, featuring a progressive learning system with gamified exercises and a modular architecture.

## Quick Start

### Prerequisites
- Python 3.9 or higher
- Modern web browser (Chrome, Firefox, Safari, or Edge)

### Full Setup (Frontend + Backend)

For the complete experience with LLM-powered tutoring and progress tracking:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/brfoley76/PromptingHumans.git
   cd PromptingHumans
   ```

2. **Start the backend server (in one terminal):**
   ```bash
   cd prompting_human_agent/backend
   pip install -r requirements.txt
   python3 -m src.main
   ```
   
   The backend API will run on `http://localhost:8001`

3. **Start the frontend server (in another terminal):**
   ```bash
   cd learning_module/web
   python3 -m http.server 8000
   ```

4. **Open in browser:**
   - Full experience: `http://localhost:8000`
   - Dev mode (all exercises unlocked): `http://localhost:8000?dev`

### Frontend Only (Standalone Mode)

To run just the frontend without backend features:

1. **Clone and navigate:**
   ```bash
   git clone https://github.com/brfoley76/PromptingHumans.git
   cd PromptingHumans/learning_module
   ```

2. **Start the development server:**
   ```bash
   cd web
   python3 -m http.server 8000
   ```

3. **Open in browser:**
   - `http://localhost:8000`
   
   **Note:** Without the backend, you won't have:
   - LLM-powered tutor chat
   - Cross-device progress sync
   - Adaptive difficulty recommendations
   - Performance analytics

## Features

### Backend Integration

The learning module is fully integrated with a Python backend that provides:

- **REST API** for session and activity management
- **WebSocket** for real-time chat communication
- **LLM-Powered Agents** (TutorAgent and ActivityAgent)
- **Database Persistence** (SQLite for development)
- **Adaptive Difficulty** based on performance history
- **Progress Tracking** across sessions

**Backend Location:** `../prompting_human_agent/backend/`

**Key Integration Components:**
- `APIClient.js` - REST API wrapper
- `SessionManager.js` - Session lifecycle management
- `WebSocketClient.js` - Real-time WebSocket communication
- `ChatWidget.js` - Main tutor chat interface
- `ActivityChatWidget.js` - Activity-specific chat interface

### Progressive Exercise System
The learning module features a carefully designed progression system where students advance through increasingly challenging exercises:

1. **Multiple Choice** (Easy) - Match definitions with vocabulary words
2. **Fill in the Blank** (Easy) - Drag words to complete definitions
3. **Spelling** (Medium) - Type correct spellings from definitions
4. **Bubble Pop** (Hard) - Fast-paced spelling recognition game
5. **Fluent Reading** (Hard) - Advanced streaming text comprehension

### Unlock System
- Exercises unlock progressively based on performance
- Achieve 80%+ on the hardest difficulty to unlock the next exercise
- Progress is saved locally in browser storage

### Developer Mode
Access developer tools by adding `?dev` to the URL:
- Unlock all exercises instantly
- Access to dev panel with debugging tools
- Reset user data and scores
- Toggle exercise lock states

## Architecture

### Modular Exercise Framework
The application uses a modular architecture with a base `ExerciseFramework` class that all exercises extend:

```
web/
├── js/
│   ├── core/
│   │   └── ExerciseFramework.js      # Base exercise class
│   ├── components/
│   │   ├── CanvasRenderer.js         # Canvas rendering utilities
│   │   └── InputHandler.js           # Input event management
│   ├── integration/
│   │   ├── APIClient.js              # REST API wrapper
│   │   ├── SessionManager.js         # Session lifecycle
│   │   ├── WebSocketClient.js        # WebSocket communication
│   │   ├── ChatWidget.js             # Main tutor chat
│   │   └── ActivityChatWidget.js     # Activity helper chat
│   ├── exercises/
│   │   ├── multipleChoice/
│   │   │   ├── MultipleChoiceExercise.js
│   │   │   └── MultipleChoiceUI.js
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
│   ├── utils/
│   │   ├── ErrorHandler.js           # Error handling
│   │   └── ClickToStart.js           # Click-to-start overlay
│   ├── app.js                        # Main application controller
│   ├── curriculum.js                 # Curriculum data management
│   └── scoreManager.js               # Score and progress tracking
```

### Key Components

#### ExerciseFramework
Base class providing common functionality:
- State management (idle, active, paused, complete)
- Score tracking and results
- Event system for exercise lifecycle
- Standardized initialization and cleanup

#### CanvasRenderer
Utility class for HTML5 Canvas operations:
- Shape drawing (rectangles, circles, lines)
- Text rendering with font support
- Image handling
- Coordinate transformations

#### InputHandler
Manages user input across different devices:
- Mouse/trackpad events
- Keyboard input
- Touch gestures (mobile support)
- Event delegation and bubbling

#### ScoreManager
Handles user progress and persistence:
- Local storage for user data
- Exercise unlock conditions
- Score history and best scores
- Progress tracking across sessions

## Exercise Details

### Multiple Choice
- **Difficulty Levels:** 3, 4, or 5 answer choices
- **Question Count:** 5, 10, 15, or 20 questions
- **Features:** Immediate feedback, progress tracking

### Fill in the Blank
- **Difficulty Levels:** 
  - Easy: Only required words in word bank
  - Moderate: All vocabulary words
- **Interaction:** Drag-and-drop interface
- **Features:** Visual feedback, word bank management

### Spelling Exercise
- **Difficulty Levels:** Easy, Medium, Hard
- **Input:** Keyboard typing with validation
- **Features:** Real-time feedback, auto-capitalization

### Bubble Pop Game
- **Game Modes:**
  - Easy: Identify correct spellings only (Q key)
  - Moderate: Identify incorrect spellings only (R key)
  - Hard: Identify both types (Q and R keys)
- **Features:**
  - Dynamic difficulty ramping
  - Visual bubble effects
  - Pause/resume functionality
  - Customizable speed and error rates

### Fluent Reading
- **Reading Modes:**
  - Easy: Vocabulary variants (67% speed, 2x time)
  - Moderate: Spelling variants (85% speed, 1.5x time)
  - Hard: All variants (100% speed, 1.3x time)
- **Features:**
  - Streaming text display
  - Fragment highlighting
  - Checkpoint system for error recovery
  - Post-exercise reading mode with scrolling
  - Paragraph formatting support

## Curriculum Structure

The curriculum is stored in JSON format (`web/data/r003.1.json`) with:

### Vocabulary
Word-definition pairs for the pirate theme:
```json
{
  "word": "ahoy",
  "definition": "a greeting used by sailors or pirates"
}
```

### Narrative
Structured reading content with variants:
```json
{
  "text": "Lucy stood on the {dock} by the ship.",
  "vocab": "pier",
  "spelling": "doc"
}
```

## Development

### Adding New Exercises
1. Extend the `ExerciseFramework` class
2. Implement required lifecycle methods:
   - `initialize(settings)`
   - `onStart()`
   - `onPause()`
   - `onEnd()`
   - `getResults()`
3. Create a UI wrapper class for settings and display
4. Register in `app.js` and add to HTML

### Code Standards
- ES6+ JavaScript features
- JSDoc comments for public methods
- Consistent naming conventions:
  - Classes: PascalCase
  - Methods/variables: camelCase
  - Constants: UPPER_SNAKE_CASE
- Error handling with try-catch blocks
- Event-driven architecture

### Testing
1. Use dev mode (`?dev`) for rapid testing
2. Test across different browsers (Chrome, Firefox, Safari)
3. Verify touch interactions on mobile devices
4. Check localStorage persistence

## Configuration

### Difficulty Settings
Each exercise supports customizable difficulty through:
- Question/item count
- Time limits
- Speed parameters
- Complexity levels

### Visual Customization
- Font families and sizes in exercise classes
- Color schemes in CSS (`web/css/styles.css`)
- Canvas dimensions (900x600 default)

## Browser Compatibility

- **Chrome:** Full support (recommended)
- **Firefox:** Full support
- **Safari:** Full support
- **Edge:** Full support
- **Mobile browsers:** Touch-optimized controls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns and standards
4. Add JSDoc comments for new methods
5. Test thoroughly in dev mode
6. Submit a pull request

## License

This project is part of the PromptingHumans educational initiative.

## Known Issues

- Mobile keyboard may overlap input fields on smaller screens
- Audio feedback system planned but not yet implemented
- Backend requires separate startup (see backend documentation)

## Roadmap

- [x] Migrate all exercises to ExerciseFramework
- [x] Backend integration with REST API and WebSocket
- [x] LLM-powered tutor and activity agents
- [x] Embedded chat architecture
- [x] Exercise completion with LLM summaries
- [ ] Add audio pronunciation support
- [ ] Implement multiplayer/classroom mode
- [ ] Add progress reporting for teachers
- [ ] Create exercise builder interface
- [ ] Add more curriculum modules
- [ ] Enhanced analytics dashboard
- [ ] A/B testing framework

## Support

For issues or questions, please use the GitHub issue tracker or contact the development team through the repository.
