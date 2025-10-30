/**
 * @fileoverview UI wrapper for Fill in the Blank exercise
 * @module FillInBlankUI
 * @requires FillInBlankExercise
 */

/**
 * UI handler for Fill in the Blank exercise
 * @class FillInBlankUI
 */
class FillInBlankUI {
    /**
     * Creates an instance of FillInBlankUI
     * @param {App} app - Main application instance
     * @param {FillInBlankExercise} exercise - Exercise instance
     */
    constructor(app, exercise) {
        this.app = app;
        this.exercise = exercise;
        this.draggedWord = null;
        
        this.setupEventListeners();
    }
    
    /**
     * Setup UI event listeners
     * @private
     */
    setupEventListeners() {
        // Settings panel
        document.getElementById('fibBackBtn')?.addEventListener('click', () => {
            this.app.showScreen('selectionScreen');
            this.app.updateExerciseCards();
        });
        
        document.getElementById('fibStartBtn')?.addEventListener('click', () => {
            this.startExercise();
        });
        
        // Exercise panel
        document.getElementById('fibCheckBtn')?.addEventListener('click', () => {
            this.checkAnswers();
        });
    }
    
    /**
     * Show the exercise screen
     */
    show() {
        this.app.showScreen('fillInBlankScreen');
        document.getElementById('fibSettingsPanel').style.display = 'block';
        document.getElementById('fibExercisePanel').style.display = 'none';
    }
    
    /**
     * Start the exercise
     * @private
     */
    startExercise() {
        const numQuestions = parseInt(document.getElementById('fibNumQuestions').value);
        const difficulty = document.getElementById('fibDifficulty').value;

        this.exercise.initialize(numQuestions, difficulty);

        document.getElementById('fibSettingsPanel').style.display = 'none';
        document.getElementById('fibExercisePanel').style.display = 'block';

        // Start activity chat widget
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.startActivity('fill_in_the_blank', difficulty);
        }

        this.displayQuestions();
    }
    
    /**
     * Display all questions
     * @private
     */
    displayQuestions() {
        const questions = this.exercise.getAllQuestions();
        const wordBank = this.exercise.getWordBank();

        // Display word bank
        const wordBankDiv = document.getElementById('wordBank');
        wordBankDiv.innerHTML = '';
        
        wordBank.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.textContent = word;
            wordItem.draggable = true;
            wordItem.dataset.word = word;
            
            this.setupDragHandlers(wordItem);
            
            wordBankDiv.appendChild(wordItem);
        });

        // Display questions
        const questionsDiv = document.getElementById('fibQuestions');
        questionsDiv.innerHTML = '';
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'fib-question';
            
            const questionText = document.createElement('div');
            questionText.className = 'fib-question-text';
            
            // Use the fitb field and replace {blank} with the actual blank space
            let fitbText = question.fitb || `A {blank} is `;
            // Capitalize the first letter of fitb
            const capitalizedFitb = this.capitalizeFirst(fitbText);
            const fitbWithBlank = capitalizedFitb.replace('{blank}', `<span class="blank-space" data-blank-id="${question.blankId}"></span>`);
            
            // Keep definition lowercase (as it comes from data)
            questionText.innerHTML = `${index + 1}. ${fitbWithBlank}${question.definition}`;
            
            questionDiv.appendChild(questionText);
            questionsDiv.appendChild(questionDiv);
            
            // Setup drop zone
            const blankSpace = questionText.querySelector('.blank-space');
            this.setupDropZone(blankSpace);
        });

        this.updateProgress();
    }
    
    /**
     * Setup drag handlers for word items
     * @private
     */
    setupDragHandlers(element) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.dataset.word);
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
        });
    }
    
    /**
     * Setup drop zone for blank spaces
     * @private
     */
    setupDropZone(blankSpace) {
        blankSpace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            blankSpace.classList.add('drag-over');
        });

        blankSpace.addEventListener('dragleave', (e) => {
            blankSpace.classList.remove('drag-over');
        });

        blankSpace.addEventListener('drop', (e) => {
            e.preventDefault();
            blankSpace.classList.remove('drag-over');
            
            const word = e.dataTransfer.getData('text/plain');
            const blankId = blankSpace.dataset.blankId;
            
            // Place word in blank
            const previousWord = this.exercise.placeWord(blankId, word);
            
            // Update display
            blankSpace.textContent = word;
            blankSpace.classList.add('filled');
            
            // Remove word from word bank
            const wordItem = document.querySelector(`.word-item[data-word="${word}"]`);
            if (wordItem) {
                wordItem.remove();
            }
            
            // If there was a previous word, add it back to word bank
            if (previousWord) {
                this.addWordToBank(previousWord);
            }
            
            // Make blank clickable to remove word
            blankSpace.style.cursor = 'pointer';
            blankSpace.onclick = () => {
                const removedWord = this.exercise.removeWord(blankId);
                if (removedWord) {
                    blankSpace.textContent = '';
                    blankSpace.classList.remove('filled', 'correct', 'incorrect');
                    this.addWordToBank(removedWord);
                }
                this.updateProgress();
            };
            
            this.updateProgress();
        });
    }
    
    /**
     * Add word back to word bank
     * @private
     */
    addWordToBank(word) {
        const wordBankDiv = document.getElementById('wordBank');
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        wordItem.textContent = word;
        wordItem.draggable = true;
        wordItem.dataset.word = word;
        
        this.setupDragHandlers(wordItem);
        wordBankDiv.appendChild(wordItem);
    }
    
    /**
     * Update progress display
     * @private
     */
    updateProgress() {
        const progress = this.exercise.getProgress();
        
        document.getElementById('fibFilled').textContent = progress.filled;
        document.getElementById('fibTotal').textContent = progress.total;
        document.getElementById('fibProgress').textContent = progress.percentage;
        
        const progressFill = document.getElementById('fibProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
        
        // Enable/disable check button
        document.getElementById('fibCheckBtn').disabled = !this.exercise.areAllBlanksFilled();
    }
    
    /**
     * Check all answers
     * @private
     */
    checkAnswers() {
        const result = this.exercise.checkAnswers();
        const difficulty = this.exercise.difficulty;
        const behavior = FillInBlankExercise.DIFFICULTY_BEHAVIORS[difficulty];
        
        // Show correct/incorrect for each blank
        const questions = this.exercise.getAllQuestions();
        questions.forEach((question, index) => {
            const blankSpace = document.querySelector(`[data-blank-id="${question.blankId}"]`);
            if (blankSpace) {
                blankSpace.classList.remove('correct', 'incorrect');
                blankSpace.classList.add(question.isCorrect ? 'correct' : 'incorrect');
                
                // Send activity event for wrong answers based on difficulty
                if (!question.isCorrect && behavior && this.app.activityChatWidget) {
                    if (behavior.feedbackTiming === 'immediate') {
                        // Easy mode: immediate feedback
                        this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
                            question: question.definition,
                            userAnswer: question.userAnswer || '(blank)',
                            correctAnswer: question.word,
                            difficulty: difficulty,
                            behavior: 'immediate_hint',
                            questionNumber: index + 1
                        });
                    } else if (behavior.feedbackTiming === 'per_question') {
                        // Moderate mode: one hint
                        this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
                            question: question.definition,
                            userAnswer: question.userAnswer || '(blank)',
                            correctAnswer: question.word,
                            difficulty: difficulty,
                            behavior: 'single_hint',
                            questionNumber: index + 1
                        });
                    }
                    // Hard mode: no immediate feedback (end_only)
                }
            }
        });
        
        // Show results after a delay
        setTimeout(() => {
            this.showResults();
        }, 2000);
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
        
        this.app.showResults('fill_in_the_blank', results);
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
    module.exports = FillInBlankUI;
}
