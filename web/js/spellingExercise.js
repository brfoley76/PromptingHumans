/**
 * Spelling Exercise Module
 */

class SpellingExercise {
    constructor(curriculumManager) {
        this.curriculumManager = curriculumManager;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.numQuestions = 10;
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
    }

    /**
     * Initialize the exercise with specified parameters
     */
    initialize(numQuestions, difficulty) {
        this.numQuestions = numQuestions;
        this.difficulty = difficulty;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.generateQuestions();
    }

    /**
     * Generate questions for the exercise
     */
    generateQuestions() {
        // Get random vocabulary items for questions
        const selectedItems = this.curriculumManager.getRandomVocabularyItems(this.numQuestions);
        
        this.questions = selectedItems.map(item => {
            return {
                word: item.word,
                definition: item.definition,
                userAnswer: '',
                isCorrect: false,
                attempted: false
            };
        });
    }

    /**
     * Get the current question
     */
    getCurrentQuestion() {
        if (this.currentQuestionIndex < this.questions.length) {
            return this.questions[this.currentQuestionIndex];
        }
        return null;
    }

    /**
     * Submit an answer for the current question
     */
    submitAnswer(answer) {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion) return false;

        // Normalize the answer (lowercase, trim)
        const normalizedAnswer = answer.toLowerCase().trim();
        const correctAnswer = currentQuestion.word.toLowerCase();

        currentQuestion.userAnswer = answer;
        currentQuestion.isCorrect = normalizedAnswer === correctAnswer;
        currentQuestion.attempted = true;
        
        if (currentQuestion.isCorrect) {
            this.score++;
        }

        this.userAnswers.push({
            questionNumber: this.currentQuestionIndex + 1,
            definition: currentQuestion.definition,
            correctAnswer: currentQuestion.word,
            userAnswer: answer,
            isCorrect: currentQuestion.isCorrect
        });

        return currentQuestion.isCorrect;
    }

    /**
     * Move to the next question
     */
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            return true;
        }
        return false;
    }

    /**
     * Check if the exercise is complete
     */
    isComplete() {
        return this.currentQuestionIndex >= this.questions.length - 1 && 
               this.getCurrentQuestion()?.attempted === true;
    }

    /**
     * Get the current progress
     */
    getProgress() {
        return {
            current: this.currentQuestionIndex + 1,
            total: this.questions.length,
            score: this.score,
            percentage: Math.round((this.currentQuestionIndex / this.questions.length) * 100)
        };
    }

    /**
     * Get the final results
     */
    getResults() {
        const percentage = Math.round((this.score / this.questions.length) * 100);
        let message = '';

        if (percentage === 100) {
            message = 'Perfect spelling! You\'re a spelling champion! 🌟';
        } else if (percentage >= 80) {
            message = 'Excellent spelling skills! Keep up the great work! 🎯';
        } else if (percentage >= 60) {
            message = 'Good effort! Practice makes perfect! 📚';
        } else if (percentage >= 40) {
            message = 'Nice try! Keep practicing those tricky words! 💪';
        } else {
            message = 'Keep learning! Every pirate needs to practice their letters! ⚓';
        }

        return {
            score: this.score,
            total: this.questions.length,
            percentage: percentage,
            message: message,
            answers: this.userAnswers
        };
    }

    /**
     * Reset the exercise
     */
    reset() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
    }

    /**
     * Validate input as user types (optional feature)
     */
    validateInput(input) {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion) return { valid: false, complete: false };

        const normalizedInput = input.toLowerCase().trim();
        const correctAnswer = currentQuestion.word.toLowerCase();
        
        // Check if input matches so far
        const matchesSoFar = correctAnswer.startsWith(normalizedInput);
        const isComplete = normalizedInput === correctAnswer;

        return {
            valid: matchesSoFar,
            complete: isComplete,
            correctLength: correctAnswer.length
        };
    }
}

// Export for use in other modules
window.SpellingExercise = SpellingExercise;
