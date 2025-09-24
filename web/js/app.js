/**
 * Main Application Controller
 */

class App {
    constructor() {
        this.curriculumManager = new CurriculumManager();
        this.exercise = new MultipleChoiceExercise(this.curriculumManager);
        this.selectedAnswer = null;
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        // Load curriculum data
        await this.curriculumManager.loadCurriculum();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.showScreen('startScreen');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startExercise();
        });

        // Submit button
        document.getElementById('submitBtn').addEventListener('click', () => {
            this.submitAnswer();
        });

        // Next button
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextQuestion();
        });

        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartExercise();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyPress(event) {
        const exerciseScreen = document.getElementById('exerciseScreen');
        
        // Only handle keys when exercise screen is active
        if (!exerciseScreen.classList.contains('active')) return;

        // Number keys 1-5 for selecting answers
        if (event.key >= '1' && event.key <= '5') {
            const optionIndex = parseInt(event.key) - 1;
            const options = document.querySelectorAll('.answer-option input[type="radio"]');
            if (options[optionIndex]) {
                options[optionIndex].click();
            }
        }

        // Enter key to submit or go to next question
        if (event.key === 'Enter') {
            const submitBtn = document.getElementById('submitBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            if (!submitBtn.disabled) {
                this.submitAnswer();
            } else if (nextBtn.style.display !== 'none') {
                this.nextQuestion();
            }
        }

        // Tab key navigation is handled by default browser behavior
    }

    /**
     * Start the exercise
     */
    startExercise() {
        // Get settings
        const numQuestions = parseInt(document.getElementById('numQuestions').value);
        const difficulty = parseInt(document.getElementById('difficulty').value);

        // Initialize exercise
        this.exercise.initialize(numQuestions, difficulty);

        // Show exercise screen
        this.showScreen('exerciseScreen');

        // Display first question
        this.displayQuestion();
    }

    /**
     * Display the current question
     */
    displayQuestion() {
        const question = this.exercise.getCurrentQuestion();
        if (!question) return;

        // Update progress
        this.updateProgress();

        // Display question text
        document.getElementById('questionText').textContent = question.definition;

        // Create answer options
        const optionsContainer = document.getElementById('answerOptions');
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

            // Add click handler to the entire option div
            optionDiv.addEventListener('click', (e) => {
                if (e.target !== radioInput) {
                    radioInput.click();
                }
            });

            // Add change handler to radio input
            radioInput.addEventListener('change', () => {
                this.selectAnswer(choice, optionDiv);
            });

            // Handle Enter key on focused option
            optionDiv.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    radioInput.click();
                }
            });

            optionsContainer.appendChild(optionDiv);
        });

        // Reset UI state
        this.selectedAnswer = null;
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('feedback').style.display = 'none';
        document.getElementById('feedback').className = 'feedback';
    }

    /**
     * Handle answer selection
     */
    selectAnswer(answer, optionDiv) {
        // Remove previous selection
        document.querySelectorAll('.answer-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Add selection to current option
        optionDiv.classList.add('selected');

        // Store selected answer
        this.selectedAnswer = answer;

        // Enable submit button
        document.getElementById('submitBtn').disabled = false;
    }

    /**
     * Submit the selected answer
     */
    submitAnswer() {
        if (!this.selectedAnswer) return;

        // Submit answer to exercise
        const isCorrect = this.exercise.submitAnswer(this.selectedAnswer);

        // Show feedback
        this.showFeedback(isCorrect);

        // Disable submit button
        document.getElementById('submitBtn').disabled = true;

        // Disable all radio buttons
        document.querySelectorAll('.answer-option input[type="radio"]').forEach(radio => {
            radio.disabled = true;
        });

        // Mark correct and incorrect answers visually
        const question = this.exercise.getCurrentQuestion();
        document.querySelectorAll('.answer-option').forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio.value === question.correctAnswer) {
                option.classList.add('correct');
            } else if (radio.value === this.selectedAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
        });

        // Show next button or complete exercise
        if (this.exercise.isComplete()) {
            setTimeout(() => {
                this.showResults();
            }, 2000);
        } else {
            document.getElementById('nextBtn').style.display = 'inline-block';
        }

        // Update score display
        document.getElementById('score').textContent = this.exercise.score;
    }

    /**
     * Show feedback for the answer
     */
    showFeedback(isCorrect) {
        const feedbackDiv = document.getElementById('feedback');
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
     * Move to the next question
     */
    nextQuestion() {
        this.exercise.nextQuestion();
        this.displayQuestion();
    }

    /**
     * Update progress display
     */
    updateProgress() {
        const progress = this.exercise.getProgress();
        
        document.getElementById('currentQuestion').textContent = progress.current;
        document.getElementById('totalQuestions').textContent = progress.total;
        document.getElementById('score').textContent = progress.score;
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = `${progress.percentage}%`;
    }

    /**
     * Show results screen
     */
    showResults() {
        const results = this.exercise.getResults();

        // Update results display
        document.getElementById('finalScore').textContent = results.score;
        document.getElementById('finalTotal').textContent = results.total;
        document.getElementById('percentage').textContent = `${results.percentage}%`;
        document.getElementById('resultsMessage').textContent = results.message;

        // Create summary list
        const summaryList = document.getElementById('resultsSummary');
        summaryList.innerHTML = '';

        results.answers.forEach(answer => {
            const li = document.createElement('li');
            li.className = answer.isCorrect ? 'correct-answer' : 'incorrect-answer';
            
            const icon = answer.isCorrect ? '✓' : '✗';
            li.innerHTML = `
                <strong>Q${answer.questionNumber}:</strong> ${answer.definition}<br>
                <span style="color: ${answer.isCorrect ? '#28a745' : '#dc3545'}">
                    ${icon} Your answer: ${answer.userAnswer}
                    ${!answer.isCorrect ? `<br>Correct answer: ${answer.correctAnswer}` : ''}
                </span>
            `;
            
            summaryList.appendChild(li);
        });

        // Show results screen
        this.showScreen('resultsScreen');
    }

    /**
     * Restart the exercise
     */
    restartExercise() {
        this.exercise.reset();
        this.selectedAnswer = null;
        this.showScreen('startScreen');
    }

    /**
     * Show a specific screen
     */
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show the specified screen
        document.getElementById(screenId).classList.add('active');
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
