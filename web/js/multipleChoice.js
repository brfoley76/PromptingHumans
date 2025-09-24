/**
 * Multiple Choice Exercise Module
 */

class MultipleChoiceExercise {
    constructor(curriculumManager) {
        this.curriculumManager = curriculumManager;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.numQuestions = 10;
        this.numChoices = 4;
    }

    /**
     * Initialize the exercise with specified parameters
     */
    initialize(numQuestions, difficulty) {
        this.numQuestions = numQuestions;
        this.numChoices = difficulty; // 3 = easy, 4 = medium, 5 = hard
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.generateQuestions();
    }

    /**
     * Generate questions for the exercise
     */
    generateQuestions() {
        const vocabulary = this.curriculumManager.getVocabulary();
        
        // Get random vocabulary items for questions
        const selectedItems = this.curriculumManager.getRandomVocabularyItems(this.numQuestions);
        
        this.questions = selectedItems.map(item => {
            // Get wrong answers (distractors)
            const distractors = this.getDistractors(item, vocabulary, this.numChoices - 1);
            
            // Combine correct answer with distractors
            const allChoices = [item.word, ...distractors];
            
            // Shuffle the choices
            const shuffledChoices = this.shuffleArray(allChoices);
            
            return {
                definition: item.definition,
                correctAnswer: item.word,
                choices: shuffledChoices,
                userAnswer: null,
                isCorrect: false
            };
        });
    }

    /**
     * Get distractor words (wrong answers) for a question
     */
    getDistractors(correctItem, allVocabulary, count) {
        // Filter out the correct answer
        const availableWords = allVocabulary
            .filter(item => item.word !== correctItem.word)
            .map(item => item.word);
        
        // Shuffle and take the required number
        const shuffled = this.shuffleArray(availableWords);
        return shuffled.slice(0, count);
    }

    /**
     * Shuffle an array using Fisher-Yates algorithm
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
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

        currentQuestion.userAnswer = answer;
        currentQuestion.isCorrect = answer === currentQuestion.correctAnswer;
        
        if (currentQuestion.isCorrect) {
            this.score++;
        }

        this.userAnswers.push({
            questionNumber: this.currentQuestionIndex + 1,
            definition: currentQuestion.definition,
            correctAnswer: currentQuestion.correctAnswer,
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
               this.getCurrentQuestion()?.userAnswer !== null;
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
            message = 'Perfect score! You\'re a vocabulary master! 🌟';
        } else if (percentage >= 80) {
            message = 'Excellent work! You really know your pirate vocabulary! 🎯';
        } else if (percentage >= 60) {
            message = 'Good job! Keep practicing to improve even more! 📚';
        } else if (percentage >= 40) {
            message = 'Nice effort! Review the words and try again! 💪';
        } else {
            message = 'Keep learning! Every pirate starts somewhere! ⚓';
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
}

// Export for use in other modules
window.MultipleChoiceExercise = MultipleChoiceExercise;
