/**
 * @fileoverview UI wrapper for Multiple Choice exercise
 * @module MultipleChoiceUI
 * @requires MultipleChoiceExercise
 */

/**
 * UI handler for Multiple Choice exercise
 * @class MultipleChoiceUI
 */
class MultipleChoiceUI {
    /**
     * Creates an instance of MultipleChoiceUI
     * @param {App} app - Main application instance
     * @param {MultipleChoiceExercise} exercise - Exercise instance
     */
    constructor(app, exercise) {
        this.app = app;
        this.exercise = exercise;
        this.selectedAnswer = null;
        
        this.setupEventListeners();
    }
    
    /**
     * Setup UI event listeners
     * @private
     */
    setupEventListeners() {
        // Settings panel
        document.getElementById('mcBackBtn')?.addEventListener('click', () => {
            this.app.showScreen('selectionScreen');
            this.app.updateExerciseCards();
        });
        
        document.getElementById('mcStartBtn')?.addEventListener('click', () => {
            this.startExercise();
        });
        
        // Exercise panel
        document.getElementById('mcSubmitBtn')?.addEventListener('click', () => {
            this.submitAnswer();
        });
        
        document.getElementById('mcNextBtn')?.addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // Exercise events
        this.exercise.on('scoreUpdate', (data) => {
            this.updateScore(data);
        });
        
        this.exercise.on('progressUpdate', (data) => {
            this.updateProgress(data);
        });
        
        this.exercise.on('complete', (results) => {
            this.showResults(results);
        });
        
        this.exercise.on('error', (error) => {
            console.error('Multiple Choice error:', error);
            alert('An error occurred: ' + error.message);
        });
    }
    
    /**
     * Show the exercise screen
     */
    show() {
        this.app.showScreen('multipleChoiceScreen');
        document.getElementById('mcSettingsPanel').style.display = 'block';
        document.getElementById('mcExercisePanel').style.display = 'none';
    }
    
    /**
     * Start the exercise
     * @private
     */
    startExercise() {
        try {
            const numQuestions = parseInt(document.getElementById('mcNumQuestions').value);
            const difficulty = parseInt(document.getElementById('mcDifficulty').value);
            
            this.exercise.initialize({
                numQuestions: numQuestions,
                difficulty: difficulty
            });
            
            this.exercise.start();
            
            document.getElementById('mcSettingsPanel').style.display = 'none';
            document.getElementById('mcExercisePanel').style.display = 'block';
            
            this.displayQuestion();
        } catch (error) {
            console.error('Failed to start exercise:', error);
            alert('Failed to start exercise: ' + error.message);
        }
    }
    
    /**
     * Display current question
     * @private
     */
    displayQuestion() {
        const question = this.exercise.getCurrentQuestion();
        if (!question) return;
        
        this.updateProgress(this.exercise.getProgress());
        
        // Display question text
        const capitalizedDefinition = this.capitalizeFirst(question.definition);
        document.getElementById('mcQuestionText').textContent = capitalizedDefinition;
        
        // Display answer options
        const optionsContainer = document.getElementById('mcAnswerOptions');
        optionsContainer.innerHTML = '';
        
        question.choices.forEach((choice, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'answer-option';
            optionDiv.setAttribute('tabindex', '0');
            
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'answer';
            radioInput.value = choice;
            radioInput.id = `option${index}`;
            
            const label = document.createElement('label');
            label.htmlFor = `option${index}`;
            label.textContent = choice;
            
            optionDiv.appendChild(radioInput);
            optionDiv.appendChild(label);
            
            // Click handlers
            optionDiv.addEventListener('click', (e) => {
                if (e.target !== radioInput) {
                    radioInput.click();
                }
            });
            
            radioInput.addEventListener('change', () => {
                this.selectAnswer(choice, optionDiv);
            });
            
            optionDiv.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    radioInput.click();
                }
            });
            
            optionsContainer.appendChild(optionDiv);
        });
        
        // Reset UI state
        this.selectedAnswer = null;
        document.getElementById('mcSubmitBtn').disabled = true;
        document.getElementById('mcNextBtn').style.display = 'none';
        document.getElementById('mcFeedback').style.display = 'none';
        document.getElementById('mcFeedback').className = 'feedback';
    }
    
    /**
     * Select an answer
     * @private
     * @param {string} answer - Selected answer
     * @param {HTMLElement} optionDiv - Option element
     */
    selectAnswer(answer, optionDiv) {
        document.querySelectorAll('.answer-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        optionDiv.classList.add('selected');
        this.selectedAnswer = answer;
        document.getElementById('mcSubmitBtn').disabled = false;
    }
    
    /**
     * Submit the selected answer
     * @private
     */
    submitAnswer() {
        if (!this.selectedAnswer) return;
        
        try {
            const isCorrect = this.exercise.submitAnswer(this.selectedAnswer);
            this.showFeedback(isCorrect);
            
            document.getElementById('mcSubmitBtn').disabled = true;
            
            // Disable all options
            document.querySelectorAll('.answer-option input[type="radio"]').forEach(radio => {
                radio.disabled = true;
            });
            
            // Show correct/incorrect styling
            const question = this.exercise.getCurrentQuestion();
            document.querySelectorAll('.answer-option').forEach(option => {
                const radio = option.querySelector('input[type="radio"]');
                if (radio.value === question.correctAnswer) {
                    option.classList.add('correct');
                } else if (radio.value === this.selectedAnswer && !isCorrect) {
                    option.classList.add('incorrect');
                }
            });
            
            // Show next button or complete
            if (this.exercise.isComplete()) {
                setTimeout(() => {
                    this.exercise.end();
                }, 2000);
            } else {
                document.getElementById('mcNextBtn').style.display = 'inline-block';
            }
        } catch (error) {
            console.error('Failed to submit answer:', error);
            alert('Failed to submit answer: ' + error.message);
        }
    }
    
    /**
     * Show feedback for answer
     * @private
     * @param {boolean} isCorrect - Whether answer was correct
     */
    showFeedback(isCorrect) {
        const feedbackDiv = document.getElementById('mcFeedback');
        const question = this.exercise.getCurrentQuestion();
        
        if (isCorrect) {
            feedbackDiv.className = 'feedback correct';
            feedbackDiv.innerHTML = '✓ Correct! Well done!';
        } else {
            feedbackDiv.className = 'feedback incorrect';
            feedbackDiv.innerHTML = `✗ Incorrect. The correct answer is: <strong>${question.correctAnswer}</strong>`;
        }
        
        feedbackDiv.style.display = 'block';
    }
    
    /**
     * Move to next question
     * @private
     */
    nextQuestion() {
        this.exercise.nextQuestion();
        if (!this.exercise.isComplete()) {
            this.displayQuestion();
        }
    }
    
    /**
     * Update score display
     * @private
     * @param {Object} data - Score data
     */
    updateScore(data) {
        document.getElementById('mcScore').textContent = data.score;
    }
    
    /**
     * Update progress display
     * @private
     * @param {Object} progress - Progress data
     */
    updateProgress(progress) {
        document.getElementById('mcCurrentQuestion').textContent = progress.current;
        document.getElementById('mcTotalQuestions').textContent = progress.total;
        document.getElementById('mcScore').textContent = progress.score;
        
        const progressFill = document.getElementById('mcProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
    }
    
    /**
     * Show results screen
     * @private
     * @param {Object} results - Exercise results
     */
    showResults(results) {
        this.app.showResults('multiple_choice', results);
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
    module.exports = MultipleChoiceUI;
}
