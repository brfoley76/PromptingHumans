# Bubble Pop Game & Modular Architecture Plan

## Overview
This document outlines the plan to complete the Bubble Pop game implementation and refactor the entire learning module system into a scalable, modular architecture that supports progressive learning with multiple curriculum modules.

## Current State Analysis

### Existing Exercises (Completed)
- ✅ Multiple Choice - Fully functional with 3 difficulty levels
- ✅ Fill in the Blank - Drag-and-drop interface with 2 difficulty levels  
- ✅ Spelling - Text input with validation

### Bubble Pop Game Status
- ⚠️ Partially implemented in multiple files
- ⚠️ Not integrated with main application
- ⚠️ Missing UI components and scoring integration

### Architecture Issues
- 🔴 Monolithic exercise files (too large for context window)
- 🔴 Tight coupling between exercises and UI
- 🔴 Limited extensibility for new exercise types
- 🔴 No standardized exercise interface

## Proposed Modular Architecture

### 1. Core Framework Layer (`/web/js/core/`)

#### ExerciseFramework.js
Base class for all exercises providing:
- Standard lifecycle methods (initialize, start, pause, end)
- Score tracking interface
- Progress reporting
- Settings management
- Event system for UI updates

#### CurriculumManager.js (Enhanced)
- Multi-module support
- Dependency graph management
- Progressive unlocking logic
- Content delivery based on mastery

#### ProgressTracker.js
- Cross-exercise progress tracking
- Mastery score calculations
- Learning path recommendations
- Analytics data collection

#### UIManager.js
- Centralized screen management
- Consistent UI state handling
- Animation coordination
- Responsive design support

### 2. Shared Components Layer (`/web/js/components/`)

#### CanvasRenderer.js
- Reusable canvas setup
- Sprite rendering
- Animation frame management
- Performance optimization

#### InputHandler.js
- Unified keyboard/mouse handling
- Touch support
- Gesture recognition
- Input validation

#### AnimationEngine.js
- Tweening system
- Particle effects
- Transition management
- Frame rate control

#### SettingsPanel.js
- Reusable settings UI
- Difficulty selection
- Exercise parameters
- Accessibility options

### 3. Exercise Modules (`/web/js/exercises/`)

Each exercise type gets its own folder with:
- Main exercise class (extends ExerciseFramework)
- UI integration module
- Exercise-specific components
- Assets and configurations

### 4. Bubble Pop Implementation Plan

#### Core Components

##### BubblePopExercise.js
```javascript
class BubblePopExercise extends ExerciseFramework {
    // Main game logic
    // Score tracking
    // Difficulty management
}
```

##### BubbleManager.js
- Bubble spawning logic
- Movement patterns
- Collision detection
- Lifecycle management

##### BubbleRenderer.js
- Canvas rendering
- Sprite management
- Visual effects
- Performance optimization

##### BubblePopUI.js
- Settings panel
- Score display
- Timer interface
- Game controls

## Implementation Phases

### Phase 1: Core Framework (Week 1)
- [ ] Create ExerciseFramework base class
- [ ] Enhance CurriculumManager for multi-module support
- [ ] Implement ProgressTracker
- [ ] Build UIManager for screen coordination

### Phase 2: Shared Components (Week 1-2)
- [ ] Extract and create CanvasRenderer
- [ ] Build unified InputHandler
- [ ] Create AnimationEngine
- [ ] Develop reusable SettingsPanel

### Phase 3: Exercise Refactoring (Week 2)
- [ ] Refactor MultipleChoice to use framework
- [ ] Refactor FillInBlank to use framework
- [ ] Refactor Spelling to use framework
- [ ] Ensure backward compatibility

### Phase 4: Bubble Pop Implementation (Week 2-3)
- [ ] Create BubblePopExercise class
- [ ] Implement BubbleManager
- [ ] Build BubbleRenderer
- [ ] Integrate with UI system
- [ ] Add scoring and unlocking

### Phase 5: Testing & Polish (Week 3)
- [ ] Unit tests for core components
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Documentation

## Technical Specifications

### Bubble Pop Game Requirements

#### Gameplay
- Words move right-to-left across screen
- Random vertical movement (tortuosity)
- Click + Q = mark as correct spelling
- Click + R = mark as incorrect spelling
- Progressive difficulty ramping every 3 minutes

#### Visual Design
- Canvas size: 900x600 pixels
- Random light background colors
- Dark text on bubble sprites
- Font size: 18-32pt (varies)
- Bubble PNG assets (4 variants)

#### Scoring
- Track: Right, Wrong, Missed
- Time-based gameplay (1-3 minutes)
- Percentage calculations
- Integration with unlock system

#### Difficulty Levels
- **Easy**: Slower speed, less tortuosity, fewer errors
- **Medium**: Moderate speed, moderate movement, balanced errors
- **Hard**: Fast speed, high tortuosity, more errors

## File Structure

```
web/
├── js/
│   ├── core/
│   │   ├── ExerciseFramework.js
│   │   ├── CurriculumManager.js
│   │   ├── ProgressTracker.js
│   │   └── UIManager.js
│   ├── components/
│   │   ├── CanvasRenderer.js
│   │   ├── InputHandler.js
│   │   ├── AnimationEngine.js
│   │   └── SettingsPanel.js
│   ├── exercises/
│   │   ├── multipleChoice/
│   │   ├── fillInBlank/
│   │   ├── spelling/
│   │   └── bubblePop/
│   └── app.js (main controller)
├── css/
│   ├── styles.css
│   └── exercises/
│       └── bubblePop.css
└── index.html
```

## Success Criteria

### Functional Requirements
- ✅ All existing exercises continue working
- ✅ Bubble Pop game fully functional
- ✅ Progressive unlocking system works
- ✅ Scores properly tracked and persisted

### Technical Requirements
- ✅ Modular, extensible architecture
- ✅ Clean separation of concerns
- ✅ Reusable components
- ✅ Well-documented code
- ✅ Performance optimized

### User Experience
- ✅ Smooth animations
- ✅ Responsive controls
- ✅ Clear feedback
- ✅ Engaging gameplay
- ✅ Progressive difficulty

## Future Enhancements

### Additional Exercise Types
- Speed Reading (streaming text)
- Word Search puzzles
- Sentence Construction
- Grammar exercises

### Platform Features
- Teacher dashboard
- Student analytics
- Multiplayer modes
- Achievement system
- Cloud sync

### Content Expansion
- Multiple curriculum modules
- Different subjects (math, science)
- Grade level progression
- Adaptive learning paths

## Notes

### Context Window Management
- Keep individual files under 500 lines
- Use dynamic imports where possible
- Lazy load exercise modules
- Minimize redundant code

### Performance Considerations
- Use requestAnimationFrame for animations
- Implement object pooling for bubbles
- Optimize canvas rendering
- Minimize DOM manipulation

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode
- Adjustable timing options

## Timeline

- **Week 1**: Core framework and shared components
- **Week 2**: Exercise refactoring and bubble pop core
- **Week 3**: Integration, testing, and polish

## Dependencies

### External Libraries
- None (vanilla JavaScript)

### Assets Required
- ✅ Bubble PNG images (already available)
- ✅ Pirate vocabulary data (already available)

### Browser Requirements
- Modern browsers with Canvas support
- ES6+ JavaScript support
- LocalStorage for persistence
