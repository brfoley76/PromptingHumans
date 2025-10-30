/**
 * Fill in the Blank Exercise Module
 */

class FillInBlankExercise {
    /**
     * Difficulty behavior configurations
     * Defines how the activity helper chat should behave at each difficulty level
     */
    static DIFFICULTY_BEHAVIORS = {
        'easy': {
            feedbackTiming: 'immediate',      // Feedback after each answer
            hintsPerMistake: 'unlimited',     // Unlimited hints
            confirmCorrections: true,         // Confirm when student fixes mistake
            description: 'Easy - Only needed words, immediate feedback'
        },
        'moderate': {
            feedbackTiming: 'per_question',   // One hint per question
            hintsPerMistake: 1,               // One hint per mistake
            confirmCorrections: true,         // Confirm corrections
            description: 'Moderate - All vocabulary, one hint per mistake'
        },
        'hard': {
            feedbackTiming: 'end_only',       // Feedback only at end
            hintsPerMistake: 0,               // No hints during exercise
            confirmCorrections: false,        // No confirmation
            description: 'Hard - All vocabulary, feedback only at end'
        }
    };

    constructor(curriculumManager) {
        this.curriculumManager = curriculumManager;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.numQuestions = 10;
        this.difficulty = 'easy'; // 'easy', 'moderate', or 'hard'
        this.draggedWord = null;
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
        const vocabulary = this.curriculumManager.getVocabulary();
        
        // Get random vocabulary items for questions
        const selectedItems = this.curriculumManager.getRandomVocabularyItems(this.numQuestions);
        
        // Create word bank based on difficulty
        let wordBank = [];
        if (this.difficulty === 'easy') {
            // Easy: only include the necessary words
            wordBank = selectedItems.map(item => item.word);
        } else {
            // Moderate/Hard: include all vocabulary words
            wordBank = vocabulary.map(item => item.word);
        }
        
        // Shuffle word bank
        wordBank = this.shuffleArray(wordBank);
        
        this.questions = selectedItems.map(item => {
            return {
                word: item.word,
                definition: item.definition,
                fitb: item.fitb || `A {blank} is `,
                userAnswer: null,
                isCorrect: false,
                blankId: `blank_${Math.random().toString(36).substr(2, 9)}`
            };
        });
        
        this.wordBank = wordBank;
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
     * Get all questions for display
     */
    getAllQuestions() {
        return this.questions;
    }

    /**
     * Get the word bank
     */
    getWordBank() {
        return this.wordBank;
    }

    /**
     * Place a word in a blank
     */
    placeWord(blankId, word) {
        const question = this.questions.find(q => q.blankId === blankId);
        if (question) {
            // If there was already a word in this blank, return it to the word bank
            const previousWord = question.userAnswer;
            
            question.userAnswer = word;
            question.isCorrect = word === question.word;
            
            return previousWord; // Return the previous word to add back to word bank
        }
        return null;
    }

    /**
     * Remove a word from a blank
     */
    removeWord(blankId) {
        const question = this.questions.find(q => q.blankId === blankId);
        if (question && question.userAnswer) {
            const word = question.userAnswer;
            question.userAnswer = null;
            question.isCorrect = false;
            return word; // Return the word to add back to word bank
        }
        return null;
    }

    /**
     * Check all answers
     */
    checkAnswers() {
        this.score = 0;
        this.userAnswers = [];
        
        this.questions.forEach((question, index) => {
            const isCorrect = question.userAnswer === question.word;
            question.isCorrect = isCorrect;
            
            if (isCorrect) {
                this.score++;
            }
            
            this.userAnswers.push({
                questionNumber: index + 1,
                word: question.word,
                definition: question.definition,
                userAnswer: question.userAnswer || '(blank)',
                isCorrect: isCorrect
            });
        });
        
        return {
            score: this.score,
            total: this.questions.length,
            percentage: Math.round((this.score / this.questions.length) * 100)
        };
    }

    /**
     * Check if all blanks are filled
     */
    areAllBlanksFilled() {
        return this.questions.every(q => q.userAnswer !== null);
    }

    /**
     * Get the current progress
     */
    getProgress() {
        const filled = this.questions.filter(q => q.userAnswer !== null).length;
        return {
            filled: filled,
            total: this.questions.length,
            percentage: Math.round((filled / this.questions.length) * 100)
        };
    }

    /**
     * Get the final results
     */
    getResults() {
        const percentage = Math.round((this.score / this.questions.length) * 100);
        let message = '';

        if (percentage === 100) {
            message = 'Perfect score! You matched all the words correctly! 🌟';
        } else if (percentage >= 80) {
            message = 'Excellent work! You really know your vocabulary! 🎯';
        } else if (percentage >= 60) {
            message = 'Good job! Keep practicing to improve even more! 📚';
        } else if (percentage >= 40) {
            message = 'Nice effort! Review the words and try again! 💪';
        } else {
            message = 'Keep learning! Practice makes perfect! ⚓';
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
        this.wordBank = [];
    }
}

// Export for use in other modules
window.FillInBlankExercise = FillInBlankExercise;
