/**
 * Score Manager Module - Handles user data and score persistence
 */

class ScoreManager {
    constructor() {
        this.storageKeyPrefix = 'learningModuleData_';
        this.currentUsername = null;
        this.userData = null;
    }

    /**
     * Validate username (alphanumeric only)
     */
    validateUsername(username) {
        return username && /^[a-zA-Z0-9]+$/.test(username);
    }

    /**
     * Load user data from localStorage for a specific username
     */
    loadUserData(username) {
        if (!username) return null;
        
        const storageKey = this.storageKeyPrefix + username;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            return JSON.parse(stored);
        }
        return null;
    }

    /**
     * Save user data to localStorage
     */
    saveUserData() {
        if (!this.currentUsername) return;
        
        const storageKey = this.storageKeyPrefix + this.currentUsername;
        localStorage.setItem(storageKey, JSON.stringify(this.userData));
    }

    /**
     * Check if user exists
     */
    hasUser() {
        return this.userData !== null && this.currentUsername !== null;
    }

    /**
     * Set current user and load their data
     */
    setUser(username, backendProgress = null) {
        if (!this.validateUsername(username)) {
            throw new Error('Invalid username: must contain only letters and numbers');
        }
        
        this.currentUsername = username;
        this.userData = this.loadUserData(username);
        
        if (!this.userData) {
            // Create new user data
            this.createUser(username);
        }
        
        // Merge backend progress if provided
        if (backendProgress) {
            this.mergeBackendProgress(backendProgress);
        }
        
        return this.userData;
    }

    /**
     * Merge backend progress with local data
     */
    mergeBackendProgress(backendProgress) {
        if (!this.userData) return;
        
        // Update unlock states from backend
        for (const [exerciseType, progressData] of Object.entries(backendProgress)) {
            if (this.userData.exercises[exerciseType]) {
                this.userData.exercises[exerciseType].unlocked = progressData.unlocked;
                
                // Update scores if backend has better data
                if (progressData.best_score && progressData.best_score.score > 0) {
                    const difficultyKey = `difficulty_${progressData.best_score.difficulty}`;
                    
                    if (!this.userData.exercises[exerciseType].scores[difficultyKey]) {
                        this.userData.exercises[exerciseType].scores[difficultyKey] = {
                            highest: { score: 0, total: 0, percentage: 0, date: null },
                            recent: { score: 0, total: 0, percentage: 0, date: null },
                            attempts: 0
                        };
                    }
                    
                    // Backend data takes precedence
                    const backendScore = progressData.best_score;
                    this.userData.exercises[exerciseType].scores[difficultyKey].highest = {
                        score: backendScore.score,
                        total: backendScore.total,
                        percentage: backendScore.percentage,
                        date: new Date().toISOString()
                    };
                    this.userData.exercises[exerciseType].scores[difficultyKey].attempts = progressData.attempts;
                }
            }
        }
        
        this.saveUserData();
    }

    /**
     * Create a new user
     */
    createUser(username) {
        this.userData = {
            name: username,
            studentId: username,  // Username is the student ID
            createdAt: new Date().toISOString(),
            exercises: {
                multiple_choice: {
                    unlocked: true,
                    scores: {}
                },
                fill_in_the_blank: {
                    unlocked: false,
                    scores: {}
                },
                spelling: {
                    unlocked: false,
                    scores: {}
                },
                bubble_pop: {
                    unlocked: false,
                    scores: {}
                },
                fluent_reading: {
                    unlocked: false,  // Fluent Reading is locked initially
                    scores: {}
                }
            }
        };
        this.saveUserData();
        return this.userData;
    }

    /**
     * Get user info
     */
    getUserInfo() {
        if (!this.userData) return null;
        return {
            name: this.userData.name,
            studentId: this.userData.studentId
        };
    }

    /**
     * Record a score for an exercise
     */
    recordScore(exerciseType, difficulty, score, total) {
        if (!this.userData) return;

        const exercise = this.userData.exercises[exerciseType];
        if (!exercise) return;

        const difficultyKey = `difficulty_${difficulty}`;
        
        if (!exercise.scores[difficultyKey]) {
            exercise.scores[difficultyKey] = {
                highest: { score: 0, total: 0, percentage: 0, date: null },
                recent: { score: 0, total: 0, percentage: 0, date: null },
                attempts: 0
            };
        }

        const percentage = Math.round((score / total) * 100);
        const now = new Date().toISOString();
        
        // Update recent score
        exercise.scores[difficultyKey].recent = {
            score: score,
            total: total,
            percentage: percentage,
            date: now
        };

        // Update highest score if this is better
        if (percentage > exercise.scores[difficultyKey].highest.percentage) {
            exercise.scores[difficultyKey].highest = {
                score: score,
                total: total,
                percentage: percentage,
                date: now
            };
        }

        // Increment attempts
        exercise.scores[difficultyKey].attempts++;

        // Check if we should unlock the next exercise
        this.checkUnlockConditions(exerciseType, difficulty, percentage);

        this.saveUserData();
    }

    /**
     * Check if we should unlock the next exercise
     */
    checkUnlockConditions(exerciseType, difficulty, percentage) {
        // Only unlock next exercise if:
        // 1. Score is 80% or higher
        // 2. Difficulty is "hard" (5 for multiple choice, "moderate" for fill-in-blank, "hard" for others)
        const isHardDifficulty = 
            (exerciseType === 'multiple_choice' && difficulty === '5') ||
            (exerciseType === 'fill_in_the_blank' && difficulty === 'moderate') ||
            (exerciseType === 'spelling' && difficulty === 'hard') ||
            (exerciseType === 'bubble_pop' && difficulty === 'hard');
        
        if (percentage >= 80 && isHardDifficulty) {
            const exerciseOrder = [
                'multiple_choice',
                'fill_in_the_blank',
                'spelling',
                'bubble_pop',
                'fluent_reading'  // Fluent Reading is unlocked after Bubble Pop
            ];
            
            const currentIndex = exerciseOrder.indexOf(exerciseType);
            if (currentIndex !== -1 && currentIndex < exerciseOrder.length - 1) {
                const nextExercise = exerciseOrder[currentIndex + 1];
                if (this.userData.exercises[nextExercise]) {
                    this.userData.exercises[nextExercise].unlocked = true;
                }
            }
        }
    }

    /**
     * Get scores for an exercise
     */
    getExerciseScores(exerciseType) {
        if (!this.userData || !this.userData.exercises[exerciseType]) {
            return null;
        }
        return this.userData.exercises[exerciseType].scores;
    }

    /**
     * Get all exercise statuses
     */
    getExerciseStatuses() {
        if (!this.userData) return {};
        
        const statuses = {};
        for (const [key, exercise] of Object.entries(this.userData.exercises)) {
            statuses[key] = {
                unlocked: exercise.unlocked,
                hasScores: Object.keys(exercise.scores).length > 0,
                scores: exercise.scores
            };
        }
        return statuses;
    }

    /**
     * Check if an exercise is unlocked
     */
    isExerciseUnlocked(exerciseType) {
        if (!this.userData || !this.userData.exercises[exerciseType]) {
            return false;
        }
        return this.userData.exercises[exerciseType].unlocked;
    }

    /**
     * Reset all user data (for testing/debugging)
     */
    resetUserData() {
        if (this.currentUsername) {
            const storageKey = this.storageKeyPrefix + this.currentUsername;
            localStorage.removeItem(storageKey);
        }
        this.userData = null;
        this.currentUsername = null;
    }
    
    /**
     * Logout current user
     */
    logout() {
        this.currentUsername = null;
        this.userData = null;
    }
    
    /**
     * Get current username
     */
    getCurrentUsername() {
        return this.currentUsername;
    }

    /**
     * Toggle lock status for an exercise (dev mode only)
     */
    toggleExerciseLock(exerciseType) {
        if (!this.userData || !this.userData.exercises[exerciseType]) {
            return false;
        }
        
        this.userData.exercises[exerciseType].unlocked = !this.userData.exercises[exerciseType].unlocked;
        this.saveUserData();
        return this.userData.exercises[exerciseType].unlocked;
    }

    /**
     * Unlock all exercises (dev mode only)
     */
    unlockAllExercises() {
        if (!this.userData) return;
        
        Object.keys(this.userData.exercises).forEach(exerciseType => {
            this.userData.exercises[exerciseType].unlocked = true;
        });
        
        this.saveUserData();
    }

    /**
     * Get best score across all difficulties for an exercise
     */
    getBestScoreForExercise(exerciseType) {
        const scores = this.getExerciseScores(exerciseType);
        if (!scores) return null;

        let bestScore = null;
        let bestDifficulty = null;

        Object.entries(scores).forEach(([difficultyKey, difficultyScores]) => {
            if (difficultyScores.highest && difficultyScores.highest.percentage > 0) {
                if (!bestScore || difficultyScores.highest.percentage > bestScore.percentage) {
                    bestScore = difficultyScores.highest;
                    // Extract difficulty from key (e.g., "difficulty_3" -> "3")
                    bestDifficulty = difficultyKey.replace('difficulty_', '');
                }
            }
        });

        if (!bestScore) return null;

        // Get the most recent score for the best difficulty
        const recentScore = scores[`difficulty_${bestDifficulty}`]?.recent;

        return {
            difficulty: bestDifficulty,
            highest: bestScore,
            recent: recentScore,
            attempts: scores[`difficulty_${bestDifficulty}`]?.attempts || 0
        };
    }

    /**
     * Get formatted score display
     */
    getFormattedScores(exerciseType, difficulty) {
        const scores = this.getExerciseScores(exerciseType);
        if (!scores) return null;

        const difficultyKey = `difficulty_${difficulty}`;
        const difficultyScores = scores[difficultyKey];
        
        if (!difficultyScores) return null;

        return {
            highest: difficultyScores.highest.percentage > 0 ? 
                `Best: ${difficultyScores.highest.score}/${difficultyScores.highest.total} (${difficultyScores.highest.percentage}%)` : 
                'No attempts yet',
            recent: difficultyScores.recent.percentage > 0 ? 
                `Last: ${difficultyScores.recent.score}/${difficultyScores.recent.total} (${difficultyScores.recent.percentage}%)` : 
                '',
            attempts: difficultyScores.attempts
        };
    }
}

// Export for use in other modules
window.ScoreManager = ScoreManager;
