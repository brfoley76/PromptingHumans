/**
 * @fileoverview UI wrapper for Spelling exercise
 * @module SpellingUI
 * @requires SpellingExercise
 */

/**
 * UI handler for Spelling exercise
 * @class SpellingUI
 */
class SpellingUI {
    /**
     * Creates an instance of SpellingUI
     * @param {App} app - Main application instance
     * @param {SpellingExercise} exercise - Exercise instance
     */
    constructor(app, exercise) {
        this.app = app;
        this.exercise = exercise;
        
        this.setupEventListeners();
    }
    
    /**
     * Setup UI event listeners
     * @private
     */
    setupEventListeners() {
        // Settings panel
        document.getElementById('spBackBtn')?.addEventListener('click', () => {
            this.app.showScreen('selectionScreen');
            this.app.updateExerciseCards();
        });
        
        document.getElementById('spStartBtn')?.addEventListener('click', () => {
            this.startExercise();
        });
        
        // Exercise panel
        document.getElementById('spSubmitBtn')?.addEventListener('click', () => {
            this.submitAnswer();
        });
        
        document.getElementById('spNextBtn')?.addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // Input field enter key handler
        const spAnswerInput = document.getElementById('spAnswerInput');
        spAnswerInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const submitBtn = document.getElementById('spSubmitBtn');
                const nextBtn = document.getElementById('spNextBtn');
                
                if (!submitBtn.disabled) {
                    this.submitAnswer();
                } else if (nextBtn.style.display !== 'none') {
                    this.nextQuestion();
                }
            }
        });
    }
    
    /**
     * Show the exercise screen
     */
    show() {
        this.app.showScreen('spellingScreen');
        document.getElementById('spSettingsPanel').style.display = 'block';
        document.getElementById('spExercisePanel').style.display = 'none';
    }
    
    /**
     * Start the exercise
     * @private
     */
    startExercise() {
        const numQuestions = parseInt(document.getElementById('spNumQuestions').value);
        const difficulty = document.getElementById('spDifficulty').value;

        this.exercise.initialize(numQuestions, difficulty);

        document.getElementById('spSettingsPanel').style.display = 'none';
        document.getElementById('spExercisePanel').style.display = 'block';

        // Start activity chat widget
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.startActivity('spelling', difficulty);
        }

        this.displayQuestion();
    }
    
    /**
     * Display current question
     * @private
     */
    displayQuestion() {
        const question = this.exercise.getCurrentQuestion();
        if (!question) return;

        this.updateProgress();

        // Display the definition with capitalized first letter
        const capitalizedDefinition = this.capitalizeFirst(question.definition);
        document.getElementById('spQuestionText').innerHTML = `${capitalizedDefinition}: _______`;

        // Clear and focus the input
        const input = document.getElementById('spAnswerInput');
        input.value = '';
        input.classList.remove('correct', 'incorrect');
        input.disabled = false;
        input.focus();

        // Reset buttons and feedback
        document.getElementById('spSubmitBtn').disabled = false;
        document.getElementById('spNextBtn').style.display = 'none';
        document.getElementById('spFeedback').style.display = 'none';
        document.getElementById('spFeedback').className = 'feedback';
        document.getElementById('spInputFeedback').textContent = '';
    }
    
    /**
     * Submit answer
     * @private
     */
    submitAnswer() {
        const input = document.getElementById('spAnswerInput');
        const answer = input.value.trim();
        
        if (!answer) return;

        const isCorrect = this.exercise.submitAnswer(answer);
        const difficulty = this.exercise.difficulty;
        const behavior = SpellingExercise.DIFFICULTY_BEHAVIORS[difficulty];
        const question = this.exercise.getCurrentQuestion();
        
        this.showFeedback(isCorrect);
        
        // Send activity event based on difficulty
        if (!isCorrect && behavior && this.app.activityChatWidget) {
            if (behavior.feedbackTiming === 'immediate') {
                // Easy mode: immediate feedback
                this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
                    question: question.definition,
                    userAnswer: answer,
                    correctAnswer: question.word,
                    difficulty: difficulty,
                    behavior: 'immediate_hint'
                });
            } else if (behavior.feedbackTiming === 'per_question') {
                // Medium mode: one hint
                this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
                    question: question.definition,
                    userAnswer: answer,
                    correctAnswer: question.word,
                    difficulty: difficulty,
                    behavior: 'single_hint'
                });
            }
            // Hard mode: no immediate feedback (end_only)
        } else if (isCorrect && behavior && behavior.confirmCorrections && this.app.activityChatWidget) {
            // Confirm correct answers in easy/medium modes
            this.app.activityChatWidget.sendActivityEvent('correct_answer', {
                question: question.definition,
                answer: answer,
                difficulty: difficulty
            });
        }
        
        // Disable input and submit button
        input.disabled = true;
        document.getElementById('spSubmitBtn').disabled = true;
        
        // Show visual feedback on input
        input.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        if (this.exercise.isComplete()) {
            setTimeout(() => {
                this.showResults();
            }, 2000);
        } else {
            document.getElementById('spNextBtn').style.display = 'inline-block';
        }
        
        document.getElementById('spScore').textContent = this.exercise.score;
    }
    
    /**
     * Show feedback for answer
     * @private
     * @param {boolean} isCorrect - Whether answer was correct
     */
    showFeedback(isCorrect) {
        const feedbackDiv = document.getElementById('spFeedback');
        const question = this.exercise.getCurrentQuestion();

        if (isCorrect) {
            feedbackDiv.className = 'feedback correct';
            feedbackDiv.innerHTML = '✓ Correct! Well spelled!';
        } else {
            feedbackDiv.className = 'feedback incorrect';
            feedbackDiv.innerHTML = `✗ Incorrect. The correct spelling is: <strong>${question.word}</strong>`;
        }

        feedbackDiv.style.display = 'block';
    }
    
    /**
     * Move to next question
     * @private
     */
    nextQuestion() {
        this.exercise.nextQuestion();
        this.displayQuestion();
    }
    
    /**
     * Update progress display
     * @private
     */
    updateProgress() {
        const progress = this.exercise.getProgress();
        
        document.getElementById('spCurrentQuestion').textContent = progress.current;
        document.getElementById('spTotalQuestions').textContent = progress.total;
        document.getElementById('spScore').textContent = progress.score;
        
        const progressFill = document.getElementById('spProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
    }
    
    /**
     * Show results screen
     * @private
     */
    showResults() {
        const results = this.exercise.getResults();
        
        // End activity chat session
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.endActivity();
        }
        
        this.app.showResults('spelling', results);
    }
    
    /**
     * Capitalize first letter of string
     * @private
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpellingUI;
}
