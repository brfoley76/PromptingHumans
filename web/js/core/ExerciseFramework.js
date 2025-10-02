/**
 * @fileoverview Base class for all learning exercises in the learning module.
 * Provides standard interface and common functionality for exercise implementations.
 * @module ExerciseFramework
 * @requires CurriculumManager
 */

/**
 * Base class providing common functionality for all exercise types.
 * Implements state management, scoring, event handling, and lifecycle methods.
 * 
 * @class ExerciseFramework
 * @example
 * class MyExercise extends ExerciseFramework {
 *   constructor(curriculumManager) {
 *     super(curriculumManager, 'my_exercise');
 *   }
 *   
 *   validateAnswer(answer) {
 *     // Custom validation logic
 *     return answer === this.correctAnswer;
 *   }
 * }
 */
class ExerciseFramework {
    /**
     * Creates an instance of ExerciseFramework.
     * 
     * @constructor
     * @param {CurriculumManager} curriculumManager - Manager for curriculum data access
     * @param {string} exerciseType - Unique identifier for the exercise type
     */
    constructor(curriculumManager, exerciseType) {
        this.curriculumManager = curriculumManager;
        this.exerciseType = exerciseType;
        
        // Exercise state
        this.state = 'idle'; // idle, ready, active, paused, completed
        this.settings = {};
        this.score = 0;
        this.totalQuestions = 0;
        this.currentQuestion = 0;
        this.startTime = null;
        this.endTime = null;
        
        // Event listeners
        this.eventListeners = {
            'stateChange': [],
            'scoreUpdate': [],
            'progressUpdate': [],
            'complete': [],
            'error': []
        };
        
        // Results tracking
        this.results = {
            answers: [],
            score: 0,
            total: 0,
            percentage: 0,
            timeSpent: 0,
            difficulty: null
        };
    }
    
    /**
     * Initialize exercise with settings.
     * Merges provided settings with defaults and resets state.
     * 
     * @param {Object} settings - Exercise-specific settings
     * @param {number} [settings.numQuestions] - Number of questions
     * @param {string} [settings.difficulty] - Difficulty level
     * @param {number} [settings.timeLimit] - Time limit in seconds
     * @returns {ExerciseFramework} Returns this for method chaining
     * @fires ExerciseFramework#stateChange
     */
    initialize(settings = {}) {
        this.settings = { ...this.getDefaultSettings(), ...settings };
        this.reset();
        this.setState('ready');
        return this;
    }
    
    /**
     * Get default settings for the exercise.
     * Should be overridden by child classes to provide specific defaults.
     * 
     * @abstract
     * @returns {Object} Default settings object
     * @returns {number} returns.numQuestions - Default number of questions
     * @returns {string} returns.difficulty - Default difficulty level
     * @returns {number|null} returns.timeLimit - Default time limit
     */
    getDefaultSettings() {
        return {
            numQuestions: 10,
            difficulty: 'medium',
            timeLimit: null
        };
    }
    
    /**
     * Start the exercise.
     * Transitions from 'ready' state to 'active' and records start time.
     * 
     * @returns {ExerciseFramework} Returns this for method chaining
     * @throws {Error} If exercise is not in 'ready' state
     * @fires ExerciseFramework#stateChange
     */
    start() {
        if (this.state !== 'ready') {
            throw new Error(`Cannot start exercise from state: ${this.state}`);
        }
        
        this.startTime = Date.now();
        this.setState('active');
        this.onStart();
        return this;
    }
    
    /**
     * Pause the exercise
     */
    pause() {
        if (this.state !== 'active') {
            throw new Error(`Cannot pause exercise from state: ${this.state}`);
        }
        
        this.setState('paused');
        this.onPause();
        return this;
    }
    
    /**
     * Resume the exercise
     */
    resume() {
        if (this.state !== 'paused') {
            throw new Error(`Cannot resume exercise from state: ${this.state}`);
        }
        
        this.setState('active');
        this.onResume();
        return this;
    }
    
    /**
     * End the exercise
     */
    end() {
        if (this.state === 'idle' || this.state === 'completed') {
            return this;
        }
        
        this.endTime = Date.now();
        this.results.timeSpent = Math.floor((this.endTime - this.startTime) / 1000);
        this.setState('completed');
        this.onEnd();
        this.emit('complete', this.getResults());
        return this;
    }
    
    /**
     * Reset the exercise
     */
    reset() {
        this.score = 0;
        this.currentQuestion = 0;
        this.results = {
            answers: [],
            score: 0,
            total: 0,
            percentage: 0,
            timeSpent: 0,
            difficulty: this.settings.difficulty
        };
        this.startTime = null;
        this.endTime = null;
        this.onReset();
        return this;
    }
    
    /**
     * Submit an answer for validation and scoring.
     * 
     * @param {*} answer - The answer to submit (type varies by exercise)
     * @returns {boolean} True if answer is correct, false otherwise
     * @throws {Error} If exercise is not in 'active' state
     * @fires ExerciseFramework#scoreUpdate
     */
    submitAnswer(answer) {
        if (this.state !== 'active') {
            throw new Error('Cannot submit answer when exercise is not active');
        }
        
        const isCorrect = this.validateAnswer(answer);
        
        if (isCorrect) {
            this.score++;
        }
        
        this.recordAnswer(answer, isCorrect);
        this.emit('scoreUpdate', { score: this.score, total: this.totalQuestions });
        
        return isCorrect;
    }
    
    /**
     * Record an answer in results
     * @param {*} answer - The submitted answer
     * @param {boolean} isCorrect - Whether the answer was correct
     */
    recordAnswer(answer, isCorrect) {
        // Override in child classes to record specific answer details
        this.results.answers.push({
            questionNumber: this.currentQuestion + 1,
            userAnswer: answer,
            isCorrect: isCorrect,
            timestamp: Date.now()
        });
    }
    
    /**
     * Validate an answer
     * Override in child classes
     * @param {*} answer - The answer to validate
     */
    validateAnswer(answer) {
        throw new Error('validateAnswer must be implemented by child class');
    }
    
    /**
     * Get current progress
     */
    getProgress() {
        return {
            current: this.currentQuestion + 1,
            total: this.totalQuestions,
            score: this.score,
            percentage: this.totalQuestions > 0 
                ? Math.round((this.currentQuestion / this.totalQuestions) * 100) 
                : 0
        };
    }
    
    /**
     * Get exercise results
     */
    getResults() {
        this.results.score = this.score;
        this.results.total = this.totalQuestions;
        this.results.percentage = this.totalQuestions > 0 
            ? Math.round((this.score / this.totalQuestions) * 100) 
            : 0;
        
        // Generate message based on percentage
        if (this.results.percentage >= 90) {
            this.results.message = 'Excellent work! You\'re a master!';
        } else if (this.results.percentage >= 80) {
            this.results.message = 'Great job! Keep up the good work!';
        } else if (this.results.percentage >= 70) {
            this.results.message = 'Good effort! You\'re getting there!';
        } else if (this.results.percentage >= 60) {
            this.results.message = 'Not bad! Keep practicing!';
        } else {
            this.results.message = 'Keep trying! Practice makes perfect!';
        }
        
        return this.results;
    }
    
    /**
     * Check if exercise is complete
     */
    isComplete() {
        return this.currentQuestion >= this.totalQuestions;
    }
    
    /**
     * Set exercise state
     * @param {string} newState - The new state
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        this.emit('stateChange', { oldState, newState });
    }
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
        return this;
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
        return this;
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                    this.emit('error', { event, error });
                }
            });
        }
    }
    
    // Lifecycle hooks for child classes to override
    
    /**
     * Called when exercise starts
     */
    onStart() {
        // Override in child classes
    }
    
    /**
     * Called when exercise is paused
     */
    onPause() {
        // Override in child classes
    }
    
    /**
     * Called when exercise is resumed
     */
    onResume() {
        // Override in child classes
    }
    
    /**
     * Called when exercise ends
     */
    onEnd() {
        // Override in child classes
    }
    
    /**
     * Called when exercise is reset
     */
    onReset() {
        // Override in child classes
    }
    
    /**
     * Get exercise metadata
     */
    getMetadata() {
        return {
            type: this.exerciseType,
            name: this.constructor.name,
            state: this.state,
            settings: this.settings,
            progress: this.getProgress()
        };
    }
    
    /**
     * Validate exercise settings
     * @param {Object} settings - Settings to validate
     */
    validateSettings(settings) {
        // Override in child classes for specific validation
        return true;
    }
    
    /**
     * Get vocabulary from curriculum manager
     */
    getVocabulary() {
        return this.curriculumManager.getVocabulary();
    }
    
    /**
     * Get random vocabulary items
     * @param {number} count - Number of items to get
     */
    getRandomVocabulary(count) {
        const vocabulary = this.getVocabulary();
        const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }
    
    /**
     * Destroy the exercise and clean up
     */
    destroy() {
        this.reset();
        this.eventListeners = {
            'stateChange': [],
            'scoreUpdate': [],
            'progressUpdate': [],
            'complete': [],
            'error': []
        };
        this.onDestroy();
    }
    
    /**
     * Called when exercise is destroyed
     */
    onDestroy() {
        // Override in child classes for cleanup
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExerciseFramework;
}
